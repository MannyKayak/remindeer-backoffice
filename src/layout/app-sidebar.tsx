import { useLogout, useGetIdentity } from "@refinedev/core";
import { Link, useLocation } from "react-router";
import {
  FileQuestionIcon,
  LayoutDashboardIcon,
  MailIcon,
  PanelsTopLeftIcon,
  TagsIcon,
  type LucideIcon,
} from "lucide-react";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Sub-sections, always expanded; the parent then only groups them. */
  children?: { label: string; to: string }[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboardIcon },
  { label: "Domande", to: "/questions", icon: FileQuestionIcon },
  { label: "Categorie", to: "/categories", icon: TagsIcon },
  { label: "Newsletter", to: "/newsletter", icon: MailIcon },
  {
    label: "Contenuti pagine",
    to: "/contenuti",
    icon: PanelsTopLeftIcon,
    // One entry per landing page.
    children: [{ label: "Home", to: "/contenuti/home" }],
  },
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
                    <SidebarMenuButton asChild isActive={isActive && !item.children}>
                      <Link to={item.to}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.children ? (
                      <SidebarMenuSub>
                        {item.children.map((child) => (
                          <SidebarMenuSubItem key={child.to}>
                            <SidebarMenuSubButton asChild isActive={pathname.startsWith(child.to)}>
                              <Link to={child.to}>
                                <span>{child.label}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    ) : null}
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
