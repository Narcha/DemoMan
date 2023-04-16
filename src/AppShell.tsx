import {
  createContext,
  forwardRef,
  ReactNode,
  RefObject,
  useContext,
} from "react";
import ReactDOM from "react-dom";

import { createStyles, UnstyledButton } from "@mantine/core";
import { Icon } from "@tabler/icons-react";

type AppShellContextType = {
  headerRef: RefObject<HTMLDivElement>;
  navbarRef: RefObject<HTMLDivElement>;
};

const AppShellContext = createContext<AppShellContextType>(
  {} as AppShellContextType
);

export const AppShellProvider = AppShellContext.Provider;

export function NavbarPortal({ children }: { children: ReactNode }) {
  const { navbarRef } = useContext(AppShellContext);
  if (navbarRef.current !== null) {
    return ReactDOM.createPortal(children, navbarRef.current);
  }
  return null;
}

export function HeaderPortal({ children }: { children: ReactNode }) {
  const { headerRef } = useContext(AppShellContext);
  if (headerRef.current !== null) {
    return ReactDOM.createPortal(children, headerRef.current);
  }
  return null;
}

const useNavbarButtonStyles = createStyles((theme) => ({
  link: {
    width: 50,
    height: 50,
    borderRadius: theme.radius.md,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[0]
        : theme.colors.gray[7],

    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[5]
          : theme.colors.gray[0],
    },
  },

  active: {
    "&, &:hover": {
      backgroundColor: theme.fn.variant({
        variant: "filled",
        color: theme.primaryColor,
      }).background,
      color: theme.fn.variant({ variant: "filled", color: theme.primaryColor })
        .color,
    },
  },
}));

type NavbarButtonProps = {
  icon: Icon;
  active?: boolean;
  onClick?(): void;
};

export const NavbarButton = forwardRef<HTMLButtonElement, NavbarButtonProps>(
  function _NavbarButton(
    { icon: Icon, active, onClick }: NavbarButtonProps,
    ref
  ) {
    const { classes, cx } = useNavbarButtonStyles();
    return (
      <UnstyledButton
        onClick={onClick}
        className={cx(classes.link, { [classes.active]: active })}
        ref={ref}
      >
        <Icon stroke={1.5} />
      </UnstyledButton>
    );
  }
);
