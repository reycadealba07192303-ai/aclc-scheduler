import 'package:flutter/material.dart';

import 'package:aclc_teacher_portal/core/errors/api_exception.dart';
import 'package:aclc_teacher_portal/core/theme/app_colors.dart';
import 'package:aclc_teacher_portal/features/teacher_home/data/teacher_repository.dart';
import 'package:aclc_teacher_portal/shared/widgets/feedback_widgets.dart';
import 'package:aclc_teacher_portal/shared/widgets/field_label.dart';

/// Opens the change-password sheet; resolves to true once the password changed.
Future<bool> showChangePasswordSheet(BuildContext context) async =>
    await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => const _ChangePasswordSheet(),
    ) ??
    false;

class _ChangePasswordSheet extends StatefulWidget {
  const _ChangePasswordSheet();
  @override
  State<_ChangePasswordSheet> createState() => _ChangePasswordSheetState();
}

class _ChangePasswordSheetState extends State<_ChangePasswordSheet> {
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  var _obscure = true;
  var _busy = false;
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_next.text.length < 12) {
      setState(
        () => _error = 'Use at least 12 characters for your new password.',
      );
      return;
    }
    if (_next.text != _confirm.text) {
      setState(() => _error = 'The new passwords do not match.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await TeacherRepository.instance.changePassword(
        currentPassword: _current.text,
        newPassword: _next.text,
      );
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = error is ApiException
              ? error.message
              : 'Could not change your password.';
        });
      }
    }
  }

  Widget _field(
    String label,
    TextEditingController controller, {
    bool last = false,
  }) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      FieldLabel(label),
      TextField(
        controller: controller,
        obscureText: _obscure,
        textInputAction: last ? TextInputAction.done : TextInputAction.next,
        onSubmitted: last ? (_) => _busy ? null : _submit() : null,
        decoration: const InputDecoration(
          prefixIcon: Icon(Icons.lock_outline_rounded, size: 20),
        ),
      ),
      const SizedBox(height: 14),
    ],
  );

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
      24,
      16,
      24,
      24 + MediaQuery.viewInsetsOf(context).bottom,
    ),
    child: SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Change password',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -.5,
                    color: AppColors.ink,
                  ),
                ),
              ),
              TextButton.icon(
                onPressed: () => setState(() => _obscure = !_obscure),
                icon: Icon(
                  _obscure
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                  size: 18,
                ),
                label: Text(_obscure ? 'Show' : 'Hide'),
              ),
            ],
          ),
          const Text(
            'At least 12 characters. You stay signed in on this phone; other devices are signed out.',
            style: TextStyle(
              fontSize: 13,
              height: 1.45,
              color: AppColors.muted,
            ),
          ),
          const SizedBox(height: 16),
          if (_error != null) ...[
            ErrorBanner(_error!),
            const SizedBox(height: 14),
          ],
          _field('Current password', _current),
          _field('New password', _next),
          _field('Confirm new password', _confirm, last: true),
          SizedBox(
            height: 50,
            child: FilledButton(
              onPressed: _busy ? null : _submit,
              style: FilledButton.styleFrom(backgroundColor: AppColors.navy),
              child: _busy
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Update password'),
            ),
          ),
        ],
      ),
    ),
  );
}
