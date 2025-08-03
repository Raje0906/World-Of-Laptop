import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Wrench,
  BarChart3,
  Users,
  Package,
  Settings,
  Laptop,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  onNavigate?: () => void;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    current: true,
  },
  {
    name: "Sales",
    href: "/sales",
    icon: ShoppingCart,
    children: [
      { name: "New Sale", href: "/sales/new" },
      { name: "Daily Sales", href: "/sales/daily" },
    ],
  },
  {
    name: "Repairs",
    href: "/repairs",
    icon: Wrench,
    children: [
      { name: "All Repairs", href: "/repairs" },
      { name: "New Repair", href: "/repairs/new" },
      { name: "Track Status", href: "/repairs/track" },
    ],
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart3,
    children: [
      { name: "Sales Reports", href: "/reports/sales" },
      { name: "Repair Reports", href: "/reports/repairs" },
      { name: "Store Performance", href: "/reports/stores" },
    ],
  },
  {
    name: "Customers",
    href: "/customers",
    icon: Users,
  },
];

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <div className="flex flex-col bg-white border-r border-gray-200 h-full shadow-md">
      {/* Logo */}
      <div className="flex items-center gap-4 px-8 py-5 border-b border-gray-200">
        <div className="flex items-center justify-center w-12 h-12 bg-primary rounded-xl shadow-sm">
          <Laptop className="w-7 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Laptop Store</h1>
          <p className="text-base text-gray-500 font-medium">CRM System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-6 py-6 space-y-3">
        {navigation.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.children &&
              item.children.some((child) => location.pathname === child.href));

          return (
            <div key={item.name}>
              <Link
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-base font-semibold rounded-xl transition-all duration-150 border",
                  isActive
                    ? "bg-primary/20 text-primary border-primary/40 shadow-sm"
                    : "text-gray-700 border-transparent hover:bg-gray-100 hover:text-gray-900 hover:shadow-sm",
                )}
              >
                <item.icon className="w-6 h-4" />
                {item.name}
              </Link>

              {/* Sub-navigation */}
              {item.children && isActive && (
                <div className="ml-8 mt-2 space-y-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.name}
                      to={child.href}
                      onClick={onNavigate}
                      className={cn(
                        "block px-3 py-2 text-sm text-gray-600 rounded-md transition-colors",
                        location.pathname === child.href
                          ? "bg-primary/5 text-primary font-medium"
                          : "hover:bg-gray-50 hover:text-gray-900",
                      )}
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {/* Admin-only: User Management */}
        {user?.role === "admin" && (
          <Link
            to="/users"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors mt-2",
              location.pathname === "/users"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <Settings className="w-5 h-5" />
            User Management
          </Link>
        )}
      </nav>

      {/* User Section */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              Admin User
            </p>
            <p className="text-xs text-gray-500 truncate">
              admin@laptopstore.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
