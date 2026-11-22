import React from "react";
import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";

export default function Breadcrumb({ items }) {
  // items: [{ label: "Home", path: "/" }, { label: "Code Security", path: "/code" }, { label: "Repositories" }]
  return (
    <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
      <Link to="/" className="flex items-center gap-1 hover:text-yellow-500 transition-colors">
        <Home className="w-3 h-3" />
        <span>Home</span>
      </Link>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight className="w-3 h-3 text-gray-600" />
          {item.path ? (
            <Link to={item.path} className="hover:text-yellow-500 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-white font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}