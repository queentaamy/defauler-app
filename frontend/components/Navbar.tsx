"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale, LayoutDashboard, PlusCircle, FolderLock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Defendant Accounts", href: "/cases", icon: FolderLock },
    { label: "Upload Agreement", href: "/upload", icon: PlusCircle },
  ];

  return (
    <header className="border-b bg-card text-card-foreground shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow">
              <Scale className="w-6 h-6 group-hover:scale-105 transition-transform" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight block leading-tight text-foreground">
                CourtOrder<span className="text-primary font-black">Tracker</span>
              </span>
              <span className="text-xs text-muted-foreground block font-medium">
                Payment & Default Engine
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-secondary text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 bg-muted/60 px-3 py-1.5 rounded-full border border-border/50 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-muted-foreground">Plaintiff:</span>
            <span className="font-semibold text-foreground">{process.env.NEXT_PUBLIC_DEFAULT_PLAINTIFF_NAME || "Universal Merchant Bank"}</span>
            <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4">
              Fixed
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
}
