"use client";

import { useAcademicStore } from "@/frontend/context/AcademicStore";
import {
  DAY_END_MINUTES,
  DAY_LABELS,
  DAY_START_MINUTES,
  formatRangeShort,
  formatTime,
  toMinutes,
  toHHMM,
} from "@/shared/lib/time";
import type { RoomBooking, ScheduleSlot } from "@/shared/types";

// Pixels per hour. Blocks, hour labels and grid lines must share this value.
const HOUR_PX = 64;
const HOUR_COUNT = (DAY_END_MINUTES - DAY_START_MINUTES) / 60; // 07:00–21:00 = 14
const GRID_HEIGHT = HOUR_COUNT * HOUR_PX;
// Every hour from 7 AM to 9 PM, including the closing line.
const HOUR_LABELS = Array.from({ length: HOUR_COUNT + 1 }, (_, i) =>
  formatTime(DAY_START_MINUTES + i * 60).replace(":00", ""),
);

/**
 * Places a day's overlapping classes side by side: each class gets a lane, and
 * every class in a group of overlapping classes shares that group's lane count.
 */
function layoutLanes(items: { id: string; startTime: string; endTime: string }[]) {
  const sorted = [...items].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime) || toMinutes(b.endTime) - toMinutes(a.endTime));
  const layout = new Map<string, { lane: number; lanes: number }>();
  let group: string[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -1;
  const closeGroup = () => {
    for (const id of group) layout.set(id, { lane: layout.get(id)!.lane, lanes: laneEnds.length });
    group = [];
    laneEnds = [];
  };
  for (const item of sorted) {
    const start = toMinutes(item.startTime);
    const end = toMinutes(item.endTime);
    if (start >= groupEnd) closeGroup();
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane < 0) lane = laneEnds.push(end) - 1;
    else laneEnds[lane] = end;
    layout.set(item.id, { lane, lanes: 1 });
    group.push(item.id);
    groupEnd = Math.max(groupEnd, end);
  }
  closeGroup();
  return layout;
}

/** Monday–Sunday weekly grid. `showTeacher` is off on a teacher's own schedule. */
export function ScheduleGrid({
  items,
  showTeacher = true,
  busyOnly = false,
  onEmptySlot,
  onSlotClick,
}: {
  items: (ScheduleSlot | RoomBooking)[];
  showTeacher?: boolean;
  /** Render schedule blocks as anonymous room occupancy, without class details. */
  busyOnly?: boolean;
  onEmptySlot?: (dayOfWeek: number, startTime: string) => void;
  onSlotClick?: (slot: ScheduleSlot) => void;
}) {
  const { sections, getSubject, getRoomName, getTeacherName } = useAcademicStore();

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[980px] pb-3">
        <div className="mb-2 grid grid-cols-[72px_repeat(7,1fr)] gap-2 text-center text-xs font-semibold uppercase tracking-wide text-ink-muted">
          <div />
          {DAY_LABELS.map((d) => (
            <div key={d.id}>{d.label}</div>
          ))}
        </div>
        <div className="relative mt-3 grid grid-cols-[72px_repeat(7,1fr)] gap-2">
          <div
            className="relative text-right text-xs text-ink-muted"
            style={{ height: GRID_HEIGHT }}
          >
            {HOUR_LABELS.map((h, i) => (
              <div
                key={h}
                className="absolute right-0 -translate-y-1/2"
                style={{ top: i * HOUR_PX }}
              >
                {h}
              </div>
            ))}
          </div>
          {DAY_LABELS.map((day) => (
            <div
              key={day.id}
              className="relative rounded-lg border border-line bg-bg-elevated"
              style={{
                height: GRID_HEIGHT,
                // Solid line every hour, faint line every 30 minutes.
                backgroundImage: [
                  `linear-gradient(to bottom, transparent ${HOUR_PX - 1}px, var(--line) ${HOUR_PX - 1}px)`,
                  `linear-gradient(to bottom, transparent ${HOUR_PX / 2 - 1}px, color-mix(in srgb, var(--line) 45%, transparent) ${HOUR_PX / 2 - 1}px, color-mix(in srgb, var(--line) 45%, transparent) ${HOUR_PX / 2}px, transparent ${HOUR_PX / 2}px)`,
                ].join(", "),
                backgroundSize: `100% ${HOUR_PX}px`,
              }}
            >
              {onEmptySlot
                ? Array.from({ length: HOUR_COUNT * 2 }, (_, index) => {
                    const start = DAY_START_MINUTES + index * 30;
                    return (
                      <button
                        key={start}
                        type="button"
                        aria-label={`Add class ${day.long} ${formatTime(start)}`}
                        title={`Add class at ${formatTime(start)}`}
                        onClick={() => onEmptySlot(day.id, toHHMM(start))}
                        className="absolute inset-x-0 z-0 rounded-sm transition hover:bg-accent/10 focus-visible:bg-accent/15 focus-visible:outline-none"
                        style={{ top: index * (HOUR_PX / 2), height: HOUR_PX / 2 }}
                      />
                    );
                  })
                : null}
              {(() => {
                const dayItems = items.filter((s) => s.dayOfWeek === day.id);
                const lanes = layoutLanes(dayItems);
                return dayItems.map((s) => {
                  const { lane, lanes: laneCount } = lanes.get(s.id) ?? { lane: 0, lanes: 1 };
                  const top = ((toMinutes(s.startTime) - DAY_START_MINUTES) / 60) * HOUR_PX;
                  const height =
                    ((toMinutes(s.endTime) - toMinutes(s.startTime)) / 60) * HOUR_PX;
                  const isRoomBooking = !("subjectId" in s);
                  const subj = isRoomBooking ? undefined : getSubject(s.subjectId);
                  const sectionName = isRoomBooking ? "" : sections.find((x) => x.id === s.sectionId)?.name;
                  const isOnline = !isRoomBooking && s.modality === "online";
                  const content = busyOnly ? <>
                      <p className="text-xs font-bold text-accent-strong">Booked</p>
                      <p className="truncate text-[10px] text-ink-muted">{formatRangeShort(s.startTime, s.endTime)}</p>
                    </> : <>
                      <p
                        className={`truncate font-bold ${laneCount > 1 ? "text-[11px]" : "text-xs"} ${
                          isOnline ? "text-info" : "text-accent-strong"
                        }`}
                      >
                        {subj?.code ?? "Class"}
                      </p>
                      <p className="truncate text-[11px] text-ink">
                        {sectionName}
                      </p>
                      <p className="truncate text-[11px] text-ink-muted">
                        {isOnline ? "Online" : getRoomName(s.roomId)}
                        {showTeacher && "teacherId" in s ? ` · ${getTeacherName(s.teacherId)}` : ""}
                      </p>
                      <p className="truncate text-[10px] text-ink-muted">
                        {formatRangeShort(s.startTime, s.endTime)}
                      </p>
                    </>;
                  const className = `absolute z-10 flex flex-col items-stretch justify-start overflow-hidden rounded-md text-left ${laneCount > 1 ? "px-1.5 py-1.5" : "p-2"} ${
                    isOnline
                      ? "border border-dashed border-info/60 bg-bg-elevated"
                      : "border-l-[3px] border-accent bg-accent-soft"
                  }${onSlotClick ? " cursor-pointer hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" : ""}`;
                  // Side-by-side lanes when classes overlap; 4px gutters inside the day column.
                  const style = {
                    top: top + 2,
                    height: Math.max(height - 4, 44),
                    left: `calc(${(lane / laneCount) * 100}% + ${lane === 0 ? 4 : 2}px)`,
                    width: `calc(${100 / laneCount}% - ${laneCount === 1 ? 8 : 6}px)`,
                  };
                  const label = `${busyOnly ? "Booked" : `Edit ${subj?.code ?? "class"}`} on ${DAY_LABELS.find((d) => d.id === s.dayOfWeek)?.long} at ${formatRangeShort(s.startTime, s.endTime)}`;
                  return onSlotClick ? (
                    <button key={s.id} type="button" aria-label={label} title={label} onClick={() => { if ("subjectId" in s) onSlotClick(s); }} className={className} style={style}>
                      {content}
                    </button>
                  ) : (
                    <div key={s.id} className={className} style={style}>
                      {content}
                    </div>
                  );
                });
              })()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
