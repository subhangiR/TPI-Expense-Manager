import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/authSlice';
import { tokenStorage } from '../api/client';
import { EXPENSE_EVENT } from '../hooks/useExpenseEvents';
import { Icons } from './icons';
import Logo from './Logo';
import { useThemeMode } from '../theme/ThemeModeProvider';
import { eventMessage } from '../utils/messages';
import type { ExpenseStatus } from '../types';

const DRAWER_WIDTH = 220;

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: <DashboardOutlined />, adminOnly: false },
  { to: '/expenses', label: 'Expenses', icon: <ReceiptLongOutlined />, adminOnly: false },
  { to: '/approvals', label: 'Approvals', icon: <FactCheckOutlined />, adminOnly: true },
];

export default function Layout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((state) => state.auth.user);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { mode, toggle: toggleTheme } = useThemeMode();
  const [toast, setToast] = useState('');
  const roleRef = useRef(user?.role); // lets the one-time event listener read the current role
  roleRef.current = user?.role;

  // One live connection (Server-Sent Events) for the whole app; the browser reconnects by itself. Each message is re-broadcast
  // as a browser event so any page can refresh itself (see useExpenseEvents).
  useEffect(() => {
    const token = tokenStorage.get();
    if (!token) return;
    const source = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);
    source.addEventListener('expense-updated', (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { title: string; status: ExpenseStatus };
      window.dispatchEvent(new Event(EXPENSE_EVENT));
      setToast(eventMessage(roleRef.current, data.title, data.status));
    });
    return () => source.close();
  }, []);

  // After you move to another page, put keyboard/screen-reader focus on the new content
  // (skipped on the very first load so we don't steal focus).
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [location.pathname]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'admin');

  const navigation = (
    <>
      <Toolbar />
      <List>
        {visibleItems.map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            end // highlight only on an exact match; NavLink also sets aria-current="page"
            onClick={() => setMobileOpen(false)}
            sx={{ '&.active': { bgcolor: 'primary.main', color: 'primary.contrastText', '& .MuiListItemIcon-root': { color: 'inherit' } } }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* First thing a keyboard user can Tab to: jump straight past the navigation. */}
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute', left: 8, top: -48, zIndex: 2000, bgcolor: 'background.paper', color: 'primary.main',
          px: 2, py: 1, borderRadius: 1, fontWeight: 600, '&:focus': { top: 8 },
        }}
      >
        Skip to main content
      </Box>

      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            aria-label="Open navigation menu"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 1, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1, minWidth: 0 }}>
            <Logo />
            <Typography component="div" variant="h3" noWrap>
              TPI Expense Manager
            </Typography>
          </Box>
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
            <Typography component="span">{user?.name}</Typography>
            {user?.role === 'admin' && <Chip label="Admin" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit' }} />}
          </Box>
          <Divider orientation="vertical" flexItem sx={{ mx: 1.5, my: 1.5, borderColor: 'currentColor', opacity: 0.3, display: { xs: 'none', sm: 'block' } }} />
          <Tooltip title={mode === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}>
            <IconButton color="inherit" onClick={toggleTheme} aria-label={mode === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}>
              {mode === 'light' ? <DarkModeOutlined /> : <LightModeOutlined />}
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ mx: 1.5, my: 1.5, borderColor: 'currentColor', opacity: 0.3 }} />
          <Button color="inherit" startIcon={<Icons.logout />} onClick={handleLogout}>
            Log out
          </Button>
        </Toolbar>
      </AppBar>

      <Box component="nav" aria-label="Main navigation" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {navigation}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}
        >
          {navigation}
        </Drawer>
      </Box>

      <Box
        component="main"
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        sx={{ flexGrow: 1, minWidth: 0, p: { xs: 1.5, sm: 2.5 }, outline: 'none' }}
      >
        <Toolbar />
        <Outlet />
      </Box>

      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="info" variant="filled" role="status" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}
