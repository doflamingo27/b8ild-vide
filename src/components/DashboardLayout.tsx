import { Outlet } from "react-router-dom";
import Footer from "./Footer";
import Header from "./Header";

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>
      
      <Footer />
    </div>
  );
};

export default DashboardLayout;
