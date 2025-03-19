// vitalis/client/src/components/layout/Layout.js
// Remover referencias a Empresas nas opções de menu
const menuItems = [
  { 
    path: '/dashboard', 
    label: 'Dashboard', 
    icon: <DashboardIcon /> 
  },
  { 
    path: '/funcionarios', 
    label: 'Funcionários', 
    icon: <PeopleIcon /> 
  },
  { 
    path: '/absenteismo', 
    label: 'Absenteísmo', 
    icon: <InsightsIcon /> 
  },
  { 
    path: '/sync-monitor', 
    label: 'Monitor de Sincronização', 
    icon: <SyncIcon /> 
  },
  { 
    path: '/settings', 
    label: 'Configurações', 
    icon: <SettingsIcon /> 
  }
];
