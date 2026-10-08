import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:aclc_teacher_portal/core/config/app_config.dart';
import 'package:aclc_teacher_portal/core/errors/api_exception.dart';
import 'package:aclc_teacher_portal/core/theme/app_colors.dart';
import 'package:aclc_teacher_portal/features/auth/data/auth_repository.dart';
import 'package:aclc_teacher_portal/features/auth/presentation/widgets/server_address_sheet.dart';
import 'package:aclc_teacher_portal/shared/widgets/brand_mark.dart';
import 'package:aclc_teacher_portal/shared/widgets/feedback_widgets.dart';
import 'package:aclc_teacher_portal/shared/widgets/field_label.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({required this.onSignedIn, super.key});
  final VoidCallback onSignedIn;
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  var _busy = false;
  var _obscurePassword = true;
  String? _error;

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await AuthRepository.instance.signIn(
        email: _identifier.text,
        password: _password.text,
      );
      widget.onSignedIn();
    } catch (error) {
      setState(
        () => _error = error is ApiException
            ? error.message
            : 'Could not sign in. Check your connection and try again.',
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _changeServer() async {
    if (await showServerAddressSheet(context) && mounted) {
      setState(() => _error = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).height < 720;
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: Colors.white,
        body: SingleChildScrollView(
          physics: const ClampingScrollPhysics(),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _LoginHero(compact: compact),
                  Transform.translate(
                    offset: const Offset(0, -_LoginHero.sheetOverlap),
                    child: _buildSheet(),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSheet() => Container(
    padding: const EdgeInsets.fromLTRB(24, 30, 24, 28),
    decoration: const BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
    ),
    child: AutofillGroup(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Sign in',
            style: TextStyle(
              color: AppColors.ink,
              fontSize: 26,
              height: 1.1,
              fontWeight: FontWeight.w600,
              letterSpacing: -.9,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Use the email and password of your registered teacher account.',
            style: TextStyle(
              color: AppColors.muted,
              fontSize: 14,
              height: 1.45,
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 18),
            ErrorBanner(_error!),
            // Connection errors name the server address; offer to fix it here.
            if (_error!.contains(AppConfig.apiBase))
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: _busy ? null : _changeServer,
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.navy,
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                  ),
                  icon: const Icon(Icons.dns_outlined, size: 17),
                  label: const Text('Change server address'),
                ),
              ),
          ],
          const SizedBox(height: 24),
          const FieldLabel('Email address'),
          TextField(
            controller: _identifier,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            autocorrect: false,
            autofillHints: const [AutofillHints.email],
            style: _fieldText,
            decoration: const InputDecoration(
              hintText: 'name@school.edu.ph',
              prefixIcon: Icon(Icons.alternate_email_rounded, size: 20),
            ),
          ),
          const SizedBox(height: 18),
          const FieldLabel('Password'),
          TextField(
            controller: _password,
            obscureText: _obscurePassword,
            textInputAction: TextInputAction.done,
            autofillHints: const [AutofillHints.password],
            onSubmitted: (_) => _busy ? null : _submit(),
            style: _fieldText,
            decoration: InputDecoration(
              hintText: 'Enter your password',
              prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
              suffixIcon: IconButton(
                tooltip: _obscurePassword ? 'Show password' : 'Hide password',
                onPressed: () =>
                    setState(() => _obscurePassword = !_obscurePassword),
                icon: Icon(
                  _obscurePassword
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                  size: 20,
                ),
              ),
            ),
          ),
          const SizedBox(height: 26),
          _GradientButton(
            busy: _busy,
            onPressed: _busy ? null : _submit,
            label: 'Continue',
          ),
          const SizedBox(height: 26),
          const _SecureNote(),
          const SizedBox(height: 14),
          const Text.rich(
            TextSpan(
              text: 'Need an account? ',
              children: [
                TextSpan(
                  text: 'Contact your school administrator.',
                  style: TextStyle(
                    color: AppColors.ink,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.muted, fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: 18),
          Center(
            child: TextButton.icon(
              onPressed: _busy ? null : _changeServer,
              style: TextButton.styleFrom(
                foregroundColor: AppColors.muted,
                visualDensity: VisualDensity.compact,
              ),
              icon: const Icon(Icons.dns_outlined, size: 15),
              label: Text(
                'Server · ${Uri.parse(AppConfig.apiBase).authority}',
                style: const TextStyle(
                  fontFamily: AppFonts.mono,
                  fontSize: 11.5,
                ),
              ),
            ),
          ),
        ],
      ),
    ),
  );

  static const _fieldText = TextStyle(
    color: AppColors.ink,
    fontSize: 15,
    fontWeight: FontWeight.w500,
    letterSpacing: -.1,
  );
}

class _LoginHero extends StatelessWidget {
  const _LoginHero({required this.compact});
  final bool compact;

  /// How far the white sign-in sheet slides up over the hero.
  static const sheetOverlap = 28.0;

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    return ClipRect(
      child: Stack(
        children: [
          const Positioned.fill(child: ColoredBox(color: AppColors.night)),
          const Positioned.fill(child: _GridBackdrop()),
          const Positioned(
            top: -140,
            right: -120,
            child: _Glow(size: 380, color: AppColors.navyBright, alpha: .55),
          ),
          const Positioned(
            bottom: -60,
            left: -150,
            child: _Glow(size: 300, color: AppColors.aclcRed, alpha: .22),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(
              24,
              top + 18,
              24,
              sheetOverlap + (compact ? 30 : 44),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const BrandMark(size: 38),
                    const SizedBox(width: 11),
                    const Text(
                      'ACLC Scheduler',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        letterSpacing: -.3,
                      ),
                    ),
                    const Spacer(),
                    _Pill(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: Color(0xFF4ADE80),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 7),
                          const Text('TEACHER', style: _monoLabel),
                        ],
                      ),
                    ),
                  ],
                ),
                SizedBox(height: compact ? 40 : 72),
                const _Pill(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.qr_code_scanner_rounded,
                        size: 14,
                        color: Color(0xFFB9C9FF),
                      ),
                      SizedBox(width: 7),
                      Text('QR attendance · live check-ins', style: _monoLabel),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                const Text('Your classes,', style: _headline),
                ShaderMask(
                  blendMode: BlendMode.srcIn,
                  shaderCallback: (bounds) => const LinearGradient(
                    colors: [Color(0xFFB9C9FF), Color(0xFF6E92FF)],
                  ).createShader(bounds),
                  child: const Text('all in one place.', style: _headline),
                ),
                const SizedBox(height: 12),
                Text(
                  'Manage your sections and scan student attendance QR codes from your phone.',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: .62),
                    fontSize: 14.5,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static const _headline = TextStyle(
    color: Colors.white,
    fontSize: 36,
    height: 1.08,
    fontWeight: FontWeight.w600,
    letterSpacing: -1.6,
  );

  static const _monoLabel = TextStyle(
    color: Color(0xFFDCE4FF),
    fontFamily: AppFonts.mono,
    fontSize: 10.5,
    fontWeight: FontWeight.w500,
    letterSpacing: .6,
  );
}

class _Pill extends StatelessWidget {
  const _Pill({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: .06),
      borderRadius: BorderRadius.circular(99),
      border: Border.all(color: Colors.white.withValues(alpha: .12)),
    ),
    child: child,
  );
}

class _Glow extends StatelessWidget {
  const _Glow({required this.size, required this.color, required this.alpha});
  final double size;
  final Color color;
  final double alpha;

  @override
  Widget build(BuildContext context) => IgnorePointer(
    child: Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [
            color.withValues(alpha: alpha),
            color.withValues(alpha: 0),
          ],
        ),
      ),
    ),
  );
}

/// Faint engineering-grid lines that fade out towards the bottom-left.
class _GridBackdrop extends StatelessWidget {
  const _GridBackdrop();

  @override
  Widget build(BuildContext context) => IgnorePointer(
    child: ShaderMask(
      blendMode: BlendMode.dstIn,
      shaderCallback: (bounds) => const RadialGradient(
        center: Alignment.topRight,
        radius: 1.3,
        colors: [Colors.white, Colors.transparent],
      ).createShader(bounds),
      child: const CustomPaint(painter: _GridPainter()),
    ),
  );
}

class _GridPainter extends CustomPainter {
  const _GridPainter();
  static const _cell = 32.0;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: .07)
      ..strokeWidth = 1;
    for (var x = size.width; x > 0; x -= _cell) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (var y = 0.0; y < size.height; y += _cell) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(_GridPainter oldDelegate) => false;
}

class _GradientButton extends StatelessWidget {
  const _GradientButton({
    required this.busy,
    required this.onPressed,
    required this.label,
  });
  final bool busy;
  final VoidCallback? onPressed;
  final String label;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(14);
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: radius,
        boxShadow: [
          BoxShadow(
            color: AppColors.navyBright.withValues(alpha: .28),
            blurRadius: 22,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: Ink(
          height: 54,
          decoration: BoxDecoration(
            borderRadius: radius,
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppColors.navyBright, AppColors.navy],
            ),
          ),
          child: InkWell(
            onTap: onPressed,
            borderRadius: radius,
            child: Center(
              child: busy
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          label,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 15.5,
                            fontWeight: FontWeight.w600,
                            letterSpacing: -.2,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Icon(
                          Icons.arrow_forward_rounded,
                          size: 18,
                          color: Colors.white,
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SecureNote extends StatelessWidget {
  const _SecureNote();

  @override
  Widget build(BuildContext context) => Row(
    children: [
      const Expanded(child: Divider(color: AppColors.line, height: 1)),
      const SizedBox(width: 12),
      const Icon(Icons.lock_rounded, size: 12, color: AppColors.muted),
      const SizedBox(width: 6),
      Text(
        'SECURE TEACHER ACCESS',
        style: TextStyle(
          color: AppColors.muted.withValues(alpha: .9),
          fontFamily: AppFonts.mono,
          fontSize: 10,
          fontWeight: FontWeight.w500,
          letterSpacing: .8,
        ),
      ),
      const SizedBox(width: 12),
      const Expanded(child: Divider(color: AppColors.line, height: 1)),
    ],
  );
}
