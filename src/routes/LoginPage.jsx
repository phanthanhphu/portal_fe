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
import { alpha, useTheme } from '@mui/material/styles';
import { Visibility, VisibilityOff } from '@mui/icons-material';

import logoYoungone from '../assets/svg/logos/logo-youngone.png';
import backgroundBsl from '../assets/images/background/background_bsl.jpg';
import { API_BASE_URL } from '../config';

export default function LoginPage() {
  const theme = useTheme();
  const navigate = useNavigate();

  const DASHBOARD_PATH = useMemo(() => '/dashboard', []);
  const LOGIN_PATH = useMemo(() => '/react/login', []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) navigate(DASHBOARD_PATH, { replace: true });
  }, [navigate, DASHBOARD_PATH]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('role', data.user?.role || '');

        toast.success('Login successful! Redirecting...');
        navigate(DASHBOARD_PATH, { replace: true });

        setTimeout(() => window.location.reload(), 120);
        return;
      }

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errData = await res.json();
        toast.error(`Login failed: ${errData.message || 'Unknown error'}`);
      } else {
        toast.error('The email or password you entered is incorrect. Please try again.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Unable to connect to the server!');
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
            flexWrap: { xs: 'wrap', md: 'nowrap' }, // ✅ FIX tụt xuống
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

            <Box sx={{ width: 'min(520px, 92%)', position: 'relative' }}>
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
                  lineHeight: 1.02,
                  textTransform: 'uppercase',
                  background: 'linear-gradient(90deg, #ffffff 0%, #dbeafe 40%, #a78bfa 70%, #67e8f9 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 18px 60px rgba(0,0,0,0.35)'
                }}
              >
                YOUNGONE
              </Typography>

              <Typography
                sx={{
                  mt: 1,
                  fontSize: '0.96rem',
                  color: alpha('#fff', 0.88),
                  lineHeight: 1.65
                }}
              >
                Inspired by nature, building vertically integrated supply chains to deliver quality, speed, and
                sustainability at scale.
              </Typography>

              <Divider sx={{ my: 2.4, borderColor: alpha('#fff', 0.14) }} />

              <Stack spacing={1.2}>
                {[
                  { t: 'Since 1974', d: 'Outdoor apparel manufacturing worldwide.' },
                  { t: 'Global Presence', d: 'Facilities across Asia & the Americas.' },
                  { t: 'Vertical Integration', d: 'In-house fabrics and insulation.' }
                ].map((x) => (
                  <Box
                    key={x.t}
                    sx={{
                      p: 1.35,
                      borderRadius: 2.4,
                      backgroundColor: alpha('#fff', 0.08),
                      border: `1px solid ${alpha('#fff', 0.14)}`,
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 18px 55px rgba(0,0,0,0.22)'
                    }}
                  >
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 900, opacity: 0.92 }}>
                      {x.t}
                    </Typography>
                    <Typography sx={{ mt: 0.25, fontSize: '0.9rem', fontWeight: 650, opacity: 0.92 }}>
                      {x.d}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              <Typography sx={{ mt: 2.6, fontSize: '0.78rem', opacity: 0.7 }}>
                © {new Date().getFullYear()} Youngone — Internal System
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

                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                  <Stack spacing={2}>
                    <TextField
                      label="Email"
                      placeholder="join.st@youngonevn.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                      onChange={(e) => setPassword(e.target.value)}
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
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 3,
                          backgroundColor: alpha('#fff', 0.9)
                        }
                      }}
                    />

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
