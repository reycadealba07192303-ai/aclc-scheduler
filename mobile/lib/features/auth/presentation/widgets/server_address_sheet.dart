import 'package:flutter/material.dart';

import 'package:aclc_teacher_portal/core/config/app_config.dart';
import 'package:aclc_teacher_portal/core/network/api_client.dart';
import 'package:aclc_teacher_portal/core/theme/app_colors.dart';
import 'package:aclc_teacher_portal/shared/widgets/feedback_widgets.dart';
import 'package:aclc_teacher_portal/shared/widgets/field_label.dart';

/// Opens the sheet; resolves to true when a new address was saved.
Future<bool> showServerAddressSheet(BuildContext context) async =>
    await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => const _ServerAddressSheet(),
    ) ??
    false;

class _ServerAddressSheet extends StatefulWidget {
  const _ServerAddressSheet();
  @override
  State<_ServerAddressSheet> createState() => _ServerAddressSheetState();
}

class _ServerAddressSheetState extends State<_ServerAddressSheet> {
  final _address = TextEditingController(text: AppConfig.apiBase);
  var _busy = false;
  var _unreachable = false;
  String? _error;

  @override
  void dispose() {
    _address.dispose();
    super.dispose();
  }

  Future<void> _save({bool force = false}) async {
    final url = AppConfig.normalize(_address.text);
    if (url == null) {
      setState(() => _error = 'Enter an address like 192.168.1.10:3000');
      return;
    }
    if (!force) {
      setState(() {
        _busy = true;
        _error = null;
      });
      final ok = await ApiClient.instance.canReach(url);
      if (!mounted) return;
      if (!ok) {
        setState(() {
          _busy = false;
          _unreachable = true;
          _error =
              'No server answered at $url. Check the IP, that the laptop is running the server, and that both are on the same Wi-Fi.';
        });
        return;
      }
    }
    await AppConfig.save(url);
    if (mounted) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
      24,
      12,
      24,
      24 + MediaQuery.viewInsetsOf(context).bottom,
    ),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(
          child: Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.line,
              borderRadius: BorderRadius.circular(99),
            ),
          ),
        ),
        const SizedBox(height: 20),
        const Text(
          'Server address',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            letterSpacing: -.5,
            color: AppColors.ink,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          "Your school's ACLC Scheduler server. On a phone, use the computer's Wi-Fi IP address and port 3000.",
          style: TextStyle(
            fontSize: 13.5,
            height: 1.45,
            color: AppColors.muted,
          ),
        ),
        const SizedBox(height: 18),
        if (_error != null) ...[
          ErrorBanner(_error!),
          const SizedBox(height: 14),
        ],
        const FieldLabel('Address'),
        TextField(
          controller: _address,
          keyboardType: TextInputType.url,
          autocorrect: false,
          textInputAction: TextInputAction.done,
          onChanged: (_) {
            if (_unreachable) setState(() => _unreachable = false);
          },
          onSubmitted: (_) => _busy ? null : _save(),
          style: const TextStyle(
            fontFamily: AppFonts.mono,
            fontSize: 14,
            color: AppColors.ink,
          ),
          decoration: const InputDecoration(
            hintText: '192.168.1.10:3000',
            prefixIcon: Icon(Icons.dns_outlined, size: 20),
          ),
        ),
        const SizedBox(height: 18),
        SizedBox(
          height: 50,
          child: FilledButton(
            onPressed: _busy ? null : () => _save(force: _unreachable),
            style: FilledButton.styleFrom(
              backgroundColor: _unreachable
                  ? const Color(0xFFB45309)
                  : AppColors.navy,
            ),
            child: _busy
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Text(_unreachable ? 'Save anyway' : 'Test and save'),
          ),
        ),
        const SizedBox(height: 6),
        TextButton(
          onPressed: _busy
              ? null
              : () => setState(() {
                  _address.text = AppConfig.buildDefault;
                  _unreachable = false;
                  _error = null;
                }),
          child: Text(
            'Reset to ${AppConfig.buildDefault}',
            style: const TextStyle(color: AppColors.muted, fontSize: 13),
          ),
        ),
      ],
    ),
  );
}
