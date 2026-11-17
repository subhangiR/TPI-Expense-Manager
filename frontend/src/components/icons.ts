import Add from '@mui/icons-material/Add';
import ArrowForward from '@mui/icons-material/ArrowForward';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import DoneAllOutlined from '@mui/icons-material/DoneAllOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import FilterListOutlined from '@mui/icons-material/FilterListOutlined';
import FilterAltOffOutlined from '@mui/icons-material/FilterAltOffOutlined';
import LoginOutlined from '@mui/icons-material/LoginOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import RefreshOutlined from '@mui/icons-material/RefreshOutlined';
import SaveOutlined from '@mui/icons-material/SaveOutlined';
import SendOutlined from '@mui/icons-material/SendOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';

export const Icons = {
  add: Add,
  edit: EditOutlined,
  delete: DeleteOutlined,
  view: VisibilityOutlined,
  submit: SendOutlined,
  approve: CheckOutlined, // a plain tick and a plain cross, with no circle, so they read clearly at button size
  reject: CloseOutlined,
  save: SaveOutlined,
  cancel: CloseOutlined,
  close: CloseOutlined,
  markRead: DoneAllOutlined,
  retry: RefreshOutlined,
  clearFilters: FilterAltOffOutlined,
  filters: FilterListOutlined,
  next: ArrowForward,
  login: LoginOutlined,
  logout: LogoutOutlined,
  dashboard: DashboardOutlined,
};
