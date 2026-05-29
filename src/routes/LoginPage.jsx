// src/pages/LoginPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import {
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Visibility, VisibilityOff } from '@mui/icons-material';

import logoYoungone from '../assets/svg/logos/logo-youngone.png';
import backgroundBsl from '../assets/images/background/background_bsl.jpg';
import { API_BASE_URL } from '../config';

const portalFeatures = ['Pinned notice', 'Internal documents', 'Work links', 'Quick search'];

const companyStats = [
  { t: 'Founded', d: '2017' },
  { t: 'Factories', d: '7' },
  { t: 'Workers', d: '8,000+' },
  { t: 'Lines', d: '240+' }
];

export default function LoginPage() {
  const navigate = useNavigate();

  const APP_LINKS_PATH = useMemo(() => '/app-links', []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) navigate(APP_LINKS_PATH, { replace: true });
  }, [navigate, APP_LINKS_PATH]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      const message = 'Please enter both email and password.';
      setLoginError(message);
      toast.error(message);
      return;
    }

    setSubmitting(true);
    setLoginError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password })
      });

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json() : null;

      if (res.ok && data?.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('role', data.user?.role || '');

        toast.success('Login successful! Redirecting...');
        navigate(APP_LINKS_PATH, { replace: true });
        return;
      }

      let message = data?.message || 'The email or password you entered is incorrect. Please try again.';

      if (res.status === 401 || res.status === 404) {
        message = 'The email or password you entered is incorrect. Please try again.';
      }

      if (res.status === 403) {
        message = data?.message || 'Your account has been disabled. Please contact the administrator.';
      }

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('role');

      setLoginError(message);
      setPassword('');
      toast.error(message);
    } catch (err) {
      console.error(err);
      const message = 'Unable to connect to the server!';
      setLoginError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'grid',
        placeItems: 'center',
        p: { xs: 1.5, sm: 2.5 }
      }}
    >
      {/* Background image */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: -3,
          backgroundImage: `url(${backgroundBsl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          transform: 'scale(1.02)'
        }}
      />
      {/* Overlay */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: -2,
          background:
            'linear-gradient(135deg, rgba(2,10,25,0.62) 0%, rgba(2,10,25,0.40) 35%, rgba(2,10,25,0.55) 100%)'
        }}
      />
      {/* Subtle blur vignette */}
      <Box
        sx={{
          position: 'fixed',
          inset: -30,
          zIndex: -1,
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          maskImage:
            'radial-gradient(circle at 55% 45%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.75) 40%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0) 100%)'
        }}
      />

      {/* Main shell */}
      <Box
        sx={{
          width: 'min(1240px, 94vw)',
          borderRadius: 4.5,
          overflow: 'hidden',
          boxShadow: '0 28px 90px rgba(0,0,0,0.42)',
          border: `1px solid ${alpha('#fff', 0.14)}`,
          backgroundColor: alpha('#0b1220', 0.35)
        }}
      >
        {/* IMPORTANT: desktop NO WRAP => login stays at position #1 */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            flexWrap: { xs: 'wrap', md: 'nowrap' },
            minHeight: { xs: 760, md: 'min(720px, 88vh)' }
          }}
        >
          {/* LEFT (Intro) */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              position: 'relative',
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              justifyContent: 'center',
              p: 5,
              color: '#fff',
              background:
                'linear-gradient(135deg, rgba(15,23,42,0.92) 0%, rgba(2,45,58,0.70) 60%, rgba(15,23,42,0.92) 100%)'
            }}
          >
            {/* Decorative blobs */}
            <Box
              sx={{
                position: 'absolute',
                width: 520,
                height: 520,
                borderRadius: '50%',
                left: -260,
                top: -260,
                background: 'radial-gradient(circle at 30% 30%, rgba(96,165,250,0.45), rgba(96,165,250,0) 60%)'
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                width: 620,
                height: 620,
                borderRadius: '50%',
                right: -320,
                bottom: -340,
                background: 'radial-gradient(circle at 30% 30%, rgba(167,139,250,0.35), rgba(167,139,250,0) 62%)'
              }}
            />

            <Box sx={{ width: 'min(540px, 92%)', position: 'relative' }}>
              {/* Logo */}
              <Box sx={{ mb: 2.4 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 2.2,
                    py: 1.2,
                    borderRadius: 2.4,
                    backgroundColor: alpha('#0b1220', 0.35),
                    border: `1px solid ${alpha('#fff', 0.14)}`,
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <img src={logoYoungone} alt="Youngone" style={{ height: 34, display: 'block' }} />
                </Box>
              </Box>

              <Typography
                sx={{
                  fontSize: '2.05rem',
                  fontWeight: 950,
                  letterSpacing: -0.6,
                  lineHeight: 1.05,
                  background: 'linear-gradient(90deg, #ffffff 0%, #dbeafe 38%, #a78bfa 68%, #67e8f9 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 18px 60px rgba(0,0,0,0.35)'
                }}
              >
                Internal portal for notices, documents, and links.
              </Typography>

              <Typography
                sx={{
                  mt: 1.3,
                  fontSize: '0.96rem',
                  color: alpha('#fff', 0.88),
                  lineHeight: 1.65
                }}
              >
                A website that brings together important notices, internal documents, and work links from departments,
                helping users search faster and save time.
              </Typography>

              <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1} sx={{ mt: 2.2 }}>
                {portalFeatures.map((item) => (
                  <Box
                    key={item}
                    sx={{
                      px: 1.4,
                      py: 0.8,
                      borderRadius: 999,
                      backgroundColor: alpha('#fff', 0.1),
                      border: `1px solid ${alpha('#fff', 0.16)}`,
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 850, color: alpha('#fff', 0.92) }}>
                      {item}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              <Divider sx={{ my: 2.4, borderColor: alpha('#fff', 0.14) }} />

              <Box
                sx={{
                  p: 1.7,
                  borderRadius: 3,
                  backgroundColor: alpha('#fff', 0.08),
                  border: `1px solid ${alpha('#fff', 0.14)}`,
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 18px 55px rgba(0,0,0,0.22)'
                }}
              >
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 950, letterSpacing: 1.2, opacity: 0.82 }}>
                  YOUNGONE
                </Typography>
                <Typography sx={{ mt: 0.35, fontSize: '1.18rem', fontWeight: 950, lineHeight: 1.25 }}>
                  BROADPEAK SOC TRANG
                </Typography>
                <Typography sx={{ mt: 0.7, fontSize: '0.88rem', fontWeight: 650, opacity: 0.86, lineHeight: 1.5 }}>
                  Global outdoor gear and apparel manufacturing facility
                </Typography>
              </Box>

              <Box
                sx={{
                  mt: 1.5,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 1.1
                }}
              >
                {companyStats.map((x) => (
                  <Box
                    key={x.t}
                    sx={{
                      p: 1.35,
                      borderRadius: 2.4,
                      backgroundColor: alpha('#fff', 0.08),
                      border: `1px solid ${alpha('#fff', 0.14)}`,
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 18px 55px rgba(0,0,0,0.18)'
                    }}
                  >
                    <Typography sx={{ fontSize: '0.76rem', fontWeight: 850, opacity: 0.72 }}>{x.t}</Typography>
                    <Typography sx={{ mt: 0.2, fontSize: '1rem', fontWeight: 950, opacity: 0.95 }}>{x.d}</Typography>
                  </Box>
                ))}
              </Box>

              <Typography sx={{ mt: 2.6, fontSize: '0.78rem', opacity: 0.7 }}>
                © {new Date().getFullYear()} Youngone — Internal Portal
              </Typography>
            </Box>
          </Box>

          {/* RIGHT (Login) — FULL WHITE AREA */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha('#ffffff', 0.92),
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              px: { xs: 2.5, sm: 5.5, md: 7 },
              py: { xs: 4, md: 0 }
            }}
          >
            {/* Fill full right pane (no small floating card) */}
            <Box
              sx={{
                width: '100%',
                height: { xs: 'auto', md: '100%' },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Box sx={{ width: 'min(520px, 100%)' }}>
                <ToastContainer position="top-right" autoClose={3000} hideProgressBar />

                <Typography sx={{ fontSize: '1.95rem', fontWeight: 950, letterSpacing: -0.6, color: '#0b1220' }}>
                  Sign in
                </Typography>
                <Typography sx={{ mt: 0.6, fontSize: '0.95rem', color: alpha('#0b1220', 0.65), lineHeight: 1.5 }}>
                  If you don’t have an account, contact admin to request access.
                </Typography>

                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 3 }}>
                  <Stack spacing={2}>
                    <TextField
                      label="Email"
                      placeholder="join.st@youngonevn.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (loginError) setLoginError('');
                      }}
                      autoComplete="email"
                      fullWidth
                      InputLabelProps={{ sx: { fontWeight: 700 } }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 3,
                          backgroundColor: alpha('#fff', 0.9)
                        }
                      }}
                    />

                    <TextField
                      label="Password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (loginError) setLoginError('');
                      }}
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      fullWidth
                      InputLabelProps={{ sx: { fontWeight: 700 } }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPw((p) => !p)} edge="end">
                              {showPw ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                      error={Boolean(loginError)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 3,
                          backgroundColor: alpha('#fff', 0.9)
                        }
                      }}
                    />

                    {loginError && (
                      <Box
                        sx={{
                          p: 1.35,
                          borderRadius: 2.5,
                          border: `1px solid ${alpha('#ef4444', 0.35)}`,
                          backgroundColor: alpha('#ef4444', 0.08)
                        }}
                      >
                        <Typography sx={{ fontSize: '0.88rem', fontWeight: 800, color: '#b91c1c' }}>
                          {loginError}
                        </Typography>
                      </Box>
                    )}

                    <Button
                      type="submit"
                      disabled={submitting}
                      variant="contained"
                      sx={{
                        height: 54,
                        borderRadius: 999,
                        textTransform: 'none',
                        fontWeight: 900,
                        fontSize: '1.02rem',
                        background: 'linear-gradient(90deg, #60a5fa 0%, #a78bfa 50%, #22d3ee 100%)',
                        boxShadow: '0 18px 55px rgba(2, 132, 199, 0.35)',
                        '&:hover': {
                          filter: 'brightness(1.05)',
                          transform: 'translateY(-1px)'
                        },
                        transition: 'all .18s ease'
                      }}
                    >
                      {submitting ? 'Signing in...' : 'Sign in'}
                    </Button>

                    <Box
                      sx={{
                        mt: 1,
                        p: 1.6,
                        borderRadius: 3,
                        border: `1px dashed ${alpha('#0b1220', 0.18)}`,
                        backgroundColor: alpha('#0ea5e9', 0.06)
                      }}
                    >
                      <Typography sx={{ fontWeight: 900, fontSize: '0.85rem', color: '#0b1220' }}>Tip</Typography>
                      <Typography sx={{ mt: 0.4, fontSize: '0.9rem', color: alpha('#0b1220', 0.65) }}>
                        Use your company email. If login keeps failing, ask admin to verify your account.
                      </Typography>
                    </Box>

                    <Typography sx={{ mt: 1.2, fontSize: '0.78rem', color: alpha('#0b1220', 0.45) }}>
                      By signing in, you agree to internal security policies.
                    </Typography>
                  </Stack>
                </Box>

                {/* Mobile: show small brand footer */}
                <Box sx={{ display: { xs: 'block', md: 'none' }, mt: 3 }}>
                  <Divider sx={{ mb: 1.5 }} />
                  <Stack direction="row" spacing={1.2} alignItems="center" justifyContent="center">
                    <img src={logoYoungone} alt="Youngone" style={{ height: 26 }} />
                    <Typography sx={{ fontSize: '0.8rem', color: alpha('#0b1220', 0.55), fontWeight: 700 }}>
                      © {new Date().getFullYear()} Youngone
                    </Typography>
                  </Stack>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
