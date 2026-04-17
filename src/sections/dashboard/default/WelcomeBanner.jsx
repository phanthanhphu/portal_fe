// material-ui
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// project-imports
import MainCard from 'components/MainCard';

// assets
import cardBack from 'assets/images/widget/img-dropbox-bg.svg';

// ==============================|| ANALYTICS - WELCOME ||============================== //

export default function WelcomeBanner() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/react/login/dashboard') {
      const hasReloaded = localStorage.getItem('hasReloadedDashboard');
      if (!hasReloaded) {
        localStorage.setItem('hasReloadedDashboard', 'true');
        window.location.reload();
      }
    }
  }, [location.pathname]);

  const stats = [
    { k: 'Founded', v: '1974' },
    { k: 'People', v: '8,000+' },
    { k: 'Footprint', v: 'Asia • Americas' }
  ];

  const pillars = [
    { k: 'Global Presence', v: 'Facilities across Asia & the Americas.' },
    { k: 'Manufacturing', v: 'Outdoor apparel & performance materials.' },
    { k: 'Integration', v: 'In-house fabrics & insulation for consistency.' }
  ];

  return (
    <MainCard
      border={false}
      sx={(theme) => ({
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 4,
        color: '#fff',
        background: `linear-gradient(135deg,
          ${alpha(theme.palette.primary.dark, 0.98)} 0%,
          ${alpha(theme.palette.primary.darker || theme.palette.primary.dark, 0.98)} 35%,
          #0b1220 100%)`,
        boxShadow: `0 24px 80px ${alpha('#000', 0.35)}`,
        border: `1px solid ${alpha('#fff', 0.10)}`,

        '&:before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(900px 360px at 14% 18%, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 62%)',
          zIndex: 0
        },
        '&:after': {
          content: '""',
          background: `url("${cardBack}") 100% 100% / cover no-repeat`,
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          opacity: 0.18,
          filter: 'saturate(0.95) contrast(1.05)'
        }
      })}
    >
      {/* ambient blobs (subtle + clean) */}
      <Box
        sx={{
          position: 'absolute',
          width: 440,
          height: 440,
          borderRadius: '50%',
          right: -210,
          top: -200,
          background: 'radial-gradient(circle at 30% 30%, rgba(96,165,250,0.55), rgba(96,165,250,0) 62%)',
          zIndex: 0
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 520,
          height: 520,
          borderRadius: '50%',
          left: -260,
          bottom: -290,
          background: 'radial-gradient(circle at 30% 30%, rgba(167,139,250,0.42), rgba(167,139,250,0) 64%)',
          zIndex: 0
        }}
      />

      <Grid container sx={{ position: 'relative', zIndex: 1 }}>
        {/* LEFT */}
        <Grid item md={7} sm={8} xs={12}>
          <Stack
            sx={{
              p: { xs: 2, sm: 3 },
              pr: { md: 2 },
              gap: 1.2
            }}
          >
            {/* top chips */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
              <Chip
                label="Youngone Corporation"
                size="small"
                sx={{
                  height: 28,
                  fontSize: '0.78rem',
                  fontWeight: 850,
                  color: '#fff',
                  borderRadius: 999,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  backdropFilter: 'blur(10px)'
                }}
              />
              <Chip
                label="Outdoor Manufacturing"
                size="small"
                sx={{
                  height: 28,
                  fontSize: '0.78rem',
                  fontWeight: 850,
                  color: '#0b1220',
                  borderRadius: 999,
                  backgroundColor: 'rgba(255,255,255,0.92)'
                }}
              />
            </Stack>

            {/* headline */}
            <Typography
              sx={{
                mt: 0.2,
                fontWeight: 950,
                letterSpacing: -0.8,
                lineHeight: 1.02,
                fontSize: { xs: '1.55rem', sm: '1.8rem', md: '2.05rem' },
                textTransform: 'uppercase',
                background: 'linear-gradient(90deg, #ffffff 0%, #dbeafe 30%, #a78bfa 68%, #67e8f9 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 18px 60px rgba(0,0,0,0.34)'
              }}
            >
              Build. Scale. Sustain.
            </Typography>

            {/* sub */}
            <Typography
              sx={{
                fontSize: { xs: '0.92rem', sm: '0.98rem' },
                color: 'rgba(255,255,255,0.86)',
                lineHeight: 1.6,
                maxWidth: 720
              }}
            >
              Inspired by nature — a global leader in outdoor apparel manufacturing, with vertically integrated
              capabilities for speed, quality, and sustainability.
            </Typography>

            {/* compact stats */}
            <Box
              sx={{
                mt: 0.8,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                gap: 1
              }}
            >
              {stats.map((s) => (
                <Box
                  key={s.k}
                  sx={{
                    p: 1.15,
                    borderRadius: 2.6,
                    backgroundColor: 'rgba(255,255,255,0.10)',
                    border: '1px solid rgba(255,255,255,0.16)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 14px 44px rgba(0,0,0,0.18)'
                  }}
                >
                  <Typography sx={{ fontSize: '0.74rem', opacity: 0.82, fontWeight: 850, letterSpacing: 0.3 }}>
                    {s.k}
                  </Typography>
                  <Typography sx={{ fontSize: '1.02rem', fontWeight: 900, mt: 0.25, lineHeight: 1.1 }}>
                    {s.v}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* key points (scan-friendly) */}
            <Box
              sx={{
                mt: 0.9,
                p: 1.2,
                borderRadius: 3,
                backgroundColor: 'rgba(0,0,0,0.16)',
                border: '1px solid rgba(255,255,255,0.10)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <Stack spacing={0.8}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ fontSize: '0.86rem', fontWeight: 900, letterSpacing: 0.4, opacity: 0.92 }}>
                    What matters
                  </Typography>
                  <Chip
                    label="Quick summary"
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: '0.72rem',
                      fontWeight: 850,
                      color: '#fff',
                      borderRadius: 999,
                      backgroundColor: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.16)'
                    }}
                  />
                </Stack>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                    gap: 1
                  }}
                >
                  {pillars.map((x) => (
                    <Box
                      key={x.k}
                      sx={{
                        p: 1.05,
                        borderRadius: 2.4,
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.12)'
                      }}
                    >
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 900, opacity: 0.9 }}>
                        {x.k}
                      </Typography>
                      <Typography sx={{ fontSize: '0.86rem', mt: 0.25, opacity: 0.86, lineHeight: 1.35 }}>
                        {x.v}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Stack>
            </Box>

            {/* CTA row */}
            <Stack direction="row" spacing={1} sx={{ mt: 0.6, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                href="https://youngonecorporation.com/what-we-do"
                target="_blank"
                sx={{
                  textTransform: 'none',
                  fontWeight: 900,
                  borderRadius: 2.4,
                  px: 2.2,
                  py: 0.95,
                  background: 'linear-gradient(90deg, #60a5fa 0%, #a78bfa 52%, #22d3ee 100%)',
                  boxShadow: '0 18px 52px rgba(0,0,0,0.28)',
                  '&:hover': { filter: 'brightness(1.06)', transform: 'translateY(-1px)' },
                  transition: 'all .2s ease'
                }}
              >
                Explore What We Do
              </Button>

              <Button
                variant="outlined"
                href="https://youngonecorporation.com/"
                target="_blank"
                sx={{
                  textTransform: 'none',
                  fontWeight: 850,
                  borderRadius: 2.4,
                  px: 2.0,
                  py: 0.95,
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.26)',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    borderColor: 'rgba(255,255,255,0.36)'
                  }
                }}
              >
                Open Website
              </Button>
            </Stack>
          </Stack>
        </Grid>

        {/* RIGHT (kept but more useful + cleaner) */}
        <Grid item md={5} sm={4} xs={12} sx={{ display: { xs: 'none', sm: 'block' } }}>
          <Stack
            sx={{
              height: '100%',
              alignItems: 'flex-end',
              justifyContent: 'center',
              pr: { sm: 2.5, md: 3.5 },
              py: 2.5
            }}
          >
            <Box
              sx={{
                width: { sm: 250, md: 300 },
                borderRadius: 3.2,
                p: 1.4,
                backgroundColor: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.16)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 18px 64px rgba(0,0,0,0.26)'
              }}
            >
              <Typography sx={{ fontSize: '0.86rem', fontWeight: 950, letterSpacing: 0.4 }}>
                Snapshot
              </Typography>

              <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.14)' }} />

              <Stack spacing={1}>
                {[
                  { k: 'Core', v: 'Outdoor apparel manufacturing' },
                  { k: 'Edge', v: 'Scale + vertical integration' },
                  { k: 'North Star', v: 'Quality & sustainability' }
                ].map((x) => (
                  <Box
                    key={x.k}
                    sx={{
                      borderRadius: 2.2,
                      p: 1.05,
                      backgroundColor: 'rgba(0,0,0,0.14)',
                      border: '1px solid rgba(255,255,255,0.10)'
                    }}
                  >
                    <Typography sx={{ fontSize: '0.74rem', opacity: 0.82, fontWeight: 900 }}>
                      {x.k}
                    </Typography>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, mt: 0.15, lineHeight: 1.25 }}>
                      {x.v}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
        </Grid>
      </Grid>
    </MainCard>
  );
}
