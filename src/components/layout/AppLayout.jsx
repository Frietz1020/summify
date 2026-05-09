import Navbar from "./Navbar";
import TabBar from "./TabBar";
import Sidebar from "./Sidebar";

export default function AppLayout({ children, fixedHeight = false }) {
  return (
    <div className={`app-layout${fixedHeight ? " app-layout--fixed" : ""}`}>
      <Navbar />
      <TabBar />
      <Sidebar />
      {children}
    </div>
  );
}
