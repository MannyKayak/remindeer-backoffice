import { useLogout, useGetIdentity } from "@refinedev/core";
import { Link, useLocation } from "react-router";
import { FileQuestionIcon, LayoutDashboardIcon, MailIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/", icon: LayoutDashboardIcon },
  { label: "Domande", to: "/questions", icon: FileQuestionIcon },
  { label: "Newsletter", to: "/newsletter", icon: MailIcon },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  const { mutate: logout } = useLogout();
  const { data: identity } = useGetIdentity<{ email?: string }>();

  return (
    <Sidebar>
      <SidebarHeader>
        <span className="px-2 text-sm font-semibold">Remindeer Backoffice</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.to}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {identity?.email ? (
          <span className="px-2 text-xs text-muted-foreground">
            {identity.email}
          </span>
        ) : null}
        <Button variant="outline" size="sm" onClick={() => logout()}>
          Log out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
