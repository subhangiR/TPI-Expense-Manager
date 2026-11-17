import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { Icons } from '../components/icons';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { login } from '../store/authSlice';
import LoadingState from '../components/LoadingState';
import useDocumentTitle from '../hooks/useDocumentTitle';

interface LoginForm {
  email: string;
  password: string;
}

// Seeded accounts (see database/seeds). Shown so a reviewer can try both roles quickly.
const DEMO_ACCOUNTS = [  { label: 'Admin', email: 'alice@tpi.com', password: 'Admin@123' },
  { label: 'Bob', email: 'bob@tpi.com', password: 'User@123' },
  { label: 'Carol', email: 'carol@tpi.com', password: 'User@123' },
  { label: 'David', email: 'david@tpi.com', password: 'User@123' },
];

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.auth.status);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ defaultValues: { email: '', password: '' } });

  if (status === 'loading') return <LoadingState label="Checking your session…" />;
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;

  const onSubmit = async (values: LoginForm) => {
    setServerError('');
    try {
      await dispatch(login(values)).unwrap();
    } catch (message) {
      setServerError(typeof message === 'string' ? message : 'Login failed. Please try again.');
    }
  };

  return (
    <Box component="main" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2, position: 'relative' }}>
      <Paper sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 4 } }}>
        <Stack spacing={1} sx={{ mb: 3, alignItems: "center" }}>
          <ReceiptLongOutlined color="primary" sx={{ fontSize: 40 }} aria-hidden="true" />
          <Typography component="h1" variant="h2">
            Sign in
          </Typography>
          <Typography color="text.secondary">TPI Expense Manager</Typography>
        </Stack>

        <form onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={isSubmitting}>
          <Stack spacing={2.5}>
            {serverError && <Alert severity="error" role="alert">{serverError}</Alert>}

            <TextField
              label="Email"
              type="email"
              placeholder="name@company.com"
              autoComplete="off"
              autoFocus
              required
              fullWidth
              error={!!errors.email}
              helperText={errors.email?.message}
              {...register('email', {
                required: 'Enter your email address',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
              })}
            />

            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              fullWidth
              error={!!errors.password}
              helperText={errors.password?.message}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((shown) => !shown)}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              {...register('password', { required: 'Enter your password' })}
            />

            <Button type="submit" variant="contained" size="large" disabled={isSubmitting} startIcon={isSubmitting ? undefined : <Icons.login />}>
              {isSubmitting ? <CircularProgress size={24} color="inherit" aria-label="Signing in" /> : 'Sign in'}
            </Button>
          </Stack>
        </form>

      </Paper>

      <Box sx={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary" component="span">
          Demo accounts:{' '}
        </Typography>
        {DEMO_ACCOUNTS.map((account) => (
          <Button
            key={account.label}
            size="small"
            sx={{ minWidth: 0, px: 1, py: 0, fontSize: '0.75rem' }}
            aria-label={`Fill form with ${account.label} demo account`}
            onClick={() => {
              setValue('email', account.email, { shouldValidate: true });
              setValue('password', account.password, { shouldValidate: true });
            }}
          >
            {account.label}
          </Button>
        ))}
      </Box>
    </Box>
  );
}
