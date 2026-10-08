import 'dart:async';

import 'package:flutter/widgets.dart';

/// Runs [onTick] every [interval] while the app is on screen, pauses while it
/// is in the background (phone locked or another app open), and runs it once
/// right away when the app comes back. Keeps idle phones from loading the
/// server.
class ForegroundPoller {
  ForegroundPoller(this.interval, this.onTick) {
    _listener = AppLifecycleListener(onShow: _resume, onHide: _pause);
    _start();
  }

  final Duration interval;
  final VoidCallback onTick;
  Timer? _timer;
  late final AppLifecycleListener _listener;

  void _start() {
    _timer?.cancel();
    _timer = Timer.periodic(interval, (_) => onTick());
  }

  void _resume() {
    onTick();
    _start();
  }

  void _pause() {
    _timer?.cancel();
    _timer = null;
  }

  void dispose() {
    _timer?.cancel();
    _listener.dispose();
  }
}
