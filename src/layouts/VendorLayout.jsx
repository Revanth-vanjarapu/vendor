import Sidebar from "./Sidebar";
import Header from "./Header";

export default function VendorLayout({ children }) {
  return (
    <div className="d-flex">
      <Sidebar />
      <div className="flex-grow-1">
        <Header />
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
