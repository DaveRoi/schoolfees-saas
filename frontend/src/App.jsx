import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './components/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Layout from './components/Layout.jsx';
import ParentHome from './pages/parent/Home.jsx';
import StudentDetail from './pages/parent/StudentDetail.jsx';
import PayFees from './pages/parent/PayFees.jsx';
import MyPayments from './pages/parent/MyPayments.jsx';
import StaffDashboard from './pages/staff/Dashboard.jsx';
import StaffStudents from './pages/staff/Students.jsx';
import StaffPayments from './pages/staff/Payments.jsx';
import StaffReports from './pages/staff/Reports.jsx';
import AdminUsers from './pages/admin/Users.jsx';
import AdminClasses from './pages/admin/Classes.jsx';
import Profile from './pages/Profile.jsx';

function Protected({ children, roles }) {
  const { user } = useAuth();
  if (user === undefined) return <div className="center" style={{ padding: 60 }}><span className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  const isParent = user?.role === 'parent';
  const isStaff = ['admin', 'coordinator', 'director'].includes(user?.role);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Protected><Layout /></Protected>}>
        <Route index element={<Navigate to={isParent ? '/mes-enfants' : '/dashboard'} replace />} />
        {isParent && (
          <>
            <Route path="/mes-enfants" element={<ParentHome />} />
            <Route path="/eleve/:id" element={<StudentDetail />} />
            <Route path="/payer/:studentId/:feeItemId" element={<PayFees />} />
            <Route path="/mes-paiements" element={<MyPayments />} />
          </>
        )}
        {isStaff && (
          <>
            <Route path="/dashboard" element={<StaffDashboard />} />
            <Route path="/eleves" element={<StaffStudents />} />
            <Route path="/paiements" element={<StaffPayments />} />
            <Route path="/rapports" element={<StaffReports />} />
          </>
        )}
        {user?.role === 'admin' && (
          <>
            <Route path="/admin/utilisateurs" element={<AdminUsers />} />
            <Route path="/admin/classes" element={<AdminClasses />} />
          </>
        )}
        <Route path="/profil" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
