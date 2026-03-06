import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

interface SidebarItemProps {
    to: string;
    icon: ReactNode;
    label: string;
}

export default function SidebarItem({ to, icon, label }: SidebarItemProps) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive
                    ? "bg-blue-50/80 text-blue-700 font-semibold shadow-sm"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/80"
                }`
            }
        >
            <div className={`w-5 h-5 transition-transform duration-200`}>{icon}</div>
            <span className="text-sm">{label}</span>
        </NavLink>
    );
}
