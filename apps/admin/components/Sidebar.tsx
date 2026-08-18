"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/users", label: "Users" },
  { href: "/cnpj-approval", label: "CNPJ Approval" },
  { href: "/disputes", label: "Disputes" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="flex w-60 shrink-0 flex-col justify-between border-r border-black/5 bg-white px-4 py-6">
      <div>
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-lg font-bold text-primary">
            H
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">Admin Central</p>
            <p className="text-xs text-black/50">Platform Control</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-secondary text-white shadow-sm"
                    : "text-black/70 hover:bg-black/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <button
        onClick={() => {
          clearToken();
          router.push("/login");
        }}
        className="rounded-xl px-3 py-2 text-left text-sm font-medium text-black/50 hover:bg-black/5"
      >
        Sair
      </button>
    </aside>
  );
}
