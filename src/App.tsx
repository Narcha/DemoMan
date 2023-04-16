import { useEffect, useRef, useState } from "react";
import {
  useNavigate,
  Routes,
  Route,
  useLocation,
  Link,
} from "react-router-dom";

import { appWindow } from "@tauri-apps/api/window";

import {
  AppShell,
  Navbar,
  Header,
  ActionIcon,
  Menu,
  Stack,
} from "@mantine/core";
import {
  IconMaximize,
  IconMinimize,
  IconX,
  IconLetterI,
  IconChevronLeft,
  IconChevronRight,
  IconDots,
  IconFolder,
  IconSettings,
  IconPlug,
} from "@tabler/icons-react";

import { AppShellProvider, NavbarButton } from "./AppShell";

import HomeView from "./views/home";
import SettingsView from "./views/settings";
import DemoDetailsView from "./views/demoDetails";
import RconSetup from "./views/rconSetup";

type HeaderIconProps = {
  icon: JSX.Element;
  onClick(): void;
};

const HeaderIcon = ({ icon, onClick }: HeaderIconProps) => {
  return (
    <ActionIcon
      variant="subtle"
      radius={0}
      size={40}
      onClick={onClick}
      tabIndex={-1}
    >
      {icon}
    </ActionIcon>
  );
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const navbarRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const unlistenFnPromise = appWindow.onResized(() =>
      appWindow.isMaximized().then(setIsMaximized)
    );
    return () => {
      unlistenFnPromise.then((unlistenFn) => unlistenFn()).catch(console.error);
    };
  }, []);

  return (
    <AppShellProvider value={{ headerRef, navbarRef }}>
      <AppShell
        padding={0}
        navbar={
          <Navbar
            width={{ base: 80 }}
            p="md"
            sx={(theme) => ({
              backgroundColor:
                theme.colorScheme === "dark"
                  ? theme.colors.dark[7]
                  : theme.white,
            })}
          >
            <Navbar.Section grow>
              <Stack spacing="sm" ref={navbarRef}></Stack>
            </Navbar.Section>
            <Navbar.Section>
              <NavbarButton
                icon={IconSettings}
                onClick={() =>
                  location.pathname === "/settings"
                    ? navigate(-1)
                    : navigate("/settings")
                }
                active={location.pathname === "/settings"}
              />
              <Menu shadow="md" width={200} position="right-end">
                <Menu.Target>
                  <NavbarButton icon={IconDots} />
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    icon={<IconPlug size={14} />}
                    component={Link}
                    to="/rcon-setup"
                  >
                    Set up RCON
                  </Menu.Item>
                  <Menu.Item icon={<IconFolder size={14} />}>
                    Open demos folder
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Navbar.Section>
          </Navbar>
        }
        header={
          <Header
            height={40}
            sx={(theme) => ({
              display: "flex",
              backgroundColor:
                theme.colorScheme === "dark"
                  ? theme.colors.dark[6]
                  : theme.white,
            })}
            data-tauri-drag-region
          >
            <HeaderIcon
              icon={<IconChevronLeft />}
              onClick={() => navigate(-1)}
            />
            <HeaderIcon
              icon={<IconChevronRight />}
              onClick={() => navigate(1)}
            />
            <div
              style={{
                flexGrow: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                // Because there are two buttons on the left and three on the right,
                // this is needed for centering
                marginLeft: "40px",
              }}
              data-tauri-drag-region
              ref={headerRef}
            />
            <HeaderIcon
              // Pull a sneaky on them (The icon set has no plain "line" icon)
              icon={<IconLetterI style={{ transform: "rotate(90deg)" }} />}
              onClick={() => appWindow.minimize()}
            />
            <HeaderIcon
              icon={isMaximized ? <IconMinimize /> : <IconMaximize />}
              onClick={() => appWindow.toggleMaximize()}
            />
            <HeaderIcon icon={<IconX />} onClick={() => appWindow.close()} />
          </Header>
        }
        styles={(theme) => ({
          main: {
            width: "100vw",
            height: "100vh",
            overflow: "hidden",
            backgroundColor:
              theme.colorScheme === "dark"
                ? theme.colors.dark[9]
                : theme.colors.gray[2],
          },
        })}
      >
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route
            path="/demo/:demoName/:activeTab"
            element={<DemoDetailsView />}
          />
          <Route path="/settings" element={<SettingsView />} />
          <Route path="/rcon-setup" element={<RconSetup />} />
        </Routes>
      </AppShell>
    </AppShellProvider>
  );
}
