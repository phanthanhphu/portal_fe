// material-ui
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// project-imports
import EcommerceDataCard from 'components/cards/statistics/EcommerceDataCard';
import { GRID_COMMON_SPACING } from 'config';

import WelcomeBanner from 'sections/dashboard/default/WelcomeBanner';
import ProjectRelease from 'sections/dashboard/default/ProjectRelease';
import EcommerceDataChart from 'sections/dashboard/default/EcommerceDataChart';
import TotalIncome from 'sections/dashboard/default/TotalIncome';
import RepeatCustomerRate from 'sections/dashboard/default/RepeatCustomerRate';
import ProjectOverview from 'sections/dashboard/default/ProjectOverview';
import Transactions from 'sections/dashboard/default/Transactions';
import AssignUsers from 'sections/dashboard/default/AssignUsers';

// assets
import { ArrowDown, ArrowUp, Book, Calendar, CloudChange, Wallet3 } from 'iconsax-reactjs';

// ==============================|| DASHBOARD - DEFAULT ||============================== //

export default function DashboardDefault() {
  const theme = useTheme();
  return (
    <Grid container spacing={GRID_COMMON_SPACING}>
      <Grid size={12}>
        <WelcomeBanner />
      </Grid>
      {/* row 1 */}
    </Grid>
  );
}
