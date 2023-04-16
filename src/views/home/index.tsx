import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
} from "react";
import { useNavigate } from "react-router-dom";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList, ListChildComponentProps } from "react-window";
import memoize from "memoize-one";

import { Alert, ScrollArea, Loader } from "@mantine/core";
import { IconFilter, IconSearch, IconArrowsSort } from "@tabler/icons-react";

import { Demo } from "../../demo";
import DemoListRow from "./DemoListRow";
import BottomBar from "./BottomBar";
import { NavbarPortal, NavbarButton } from "../../AppShell";
import { getDemosInDirectory } from "../../api";
import { Async, Fill } from "../../components";

const PADDING_SIZE = 16;

// eslint-disable-next-line react/display-name
const innerElementType = forwardRef<HTMLDivElement>(
  (
    // eslint-disable-next-line react/prop-types
    { style, ...rest }: React.ComponentProps<"div">,
    ref: React.ClassAttributes<HTMLDivElement>["ref"]
  ) => (
    <div
      ref={ref}
      style={{
        ...style,
        paddingLeft: PADDING_SIZE,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        height: (style!.height as number) + PADDING_SIZE,
      }}
      {...rest}
    />
  )
);

type ItemDataType = {
  demos: Demo[];
  selectedRows: boolean[];
  toggleRowSelected(index: number): void;
};

const createItemData = memoize(
  (
    demos: Demo[],
    selectedRows: boolean[],
    toggleRowSelected: (index: number) => void
  ): ItemDataType => ({
    demos,
    selectedRows,
    toggleRowSelected,
  })
);

function MainView({ demos }: { demos: Demo[] }) {
  const navigate = useNavigate();
  const listRef = useRef<FixedSizeList>(null);

  const [selectedRows, setSelectedRows] = useState<boolean[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  const sortedDemos = useMemo(() => {
    const newSortedDemos = [...demos];
    newSortedDemos.sort((a, b) => b.birthtime - a.birthtime);
    return newSortedDemos;
  }, [demos]);

  // Reset the selected rows every time the demos are changed or selection mode is toggled
  useEffect(() => {
    setSelectedRows(Array(sortedDemos.length).fill(false));
  }, [sortedDemos, selectionMode]);

  const handleRowClick = useCallback(
    (index: number) => {
      if (selectionMode) {
        setSelectedRows((oldSelectedIndices) => {
          const newSelectedIndices = [...oldSelectedIndices];
          newSelectedIndices[index] = !newSelectedIndices[index];
          return newSelectedIndices;
        });
      } else {
        navigate(
          `/demo/${encodeURIComponent(sortedDemos[index].name)}/players`
        );
      }
    },
    [navigate, selectionMode, sortedDemos]
  );

  const totalFileSize = useMemo(
    () => sortedDemos.reduce((total, demo) => total + demo.filesize, 0),
    [sortedDemos]
  );

  const selectedFileSize = useMemo(
    () =>
      sortedDemos.reduce(
        (total, demo, index) =>
          selectedRows[index] ? total + demo.filesize : total,
        0
      ),
    [sortedDemos, selectedRows]
  );

  const selectedDemoCount = useMemo(
    () => selectedRows.reduce((total, value) => total + Number(value), 0),
    [selectedRows]
  );

  const itemData = createItemData(sortedDemos, selectedRows, handleRowClick);

  return (
    <>
      <NavbarPortal>
        <NavbarButton icon={IconFilter} />
        <NavbarButton icon={IconSearch} />
        <NavbarButton icon={IconArrowsSort} />
      </NavbarPortal>
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
        }}
      >
        <div style={{ flexGrow: 1 }}>
          <AutoSizer>
            {({ height, width }) => (
              <ScrollArea
                style={{ width, height }}
                onScrollPositionChange={({ y }) => listRef.current?.scrollTo(y)}
              >
                <FixedSizeList
                  height={height}
                  width={width}
                  style={{ overflow: "visible" }}
                  itemCount={sortedDemos.length}
                  itemSize={120 + PADDING_SIZE}
                  itemData={itemData}
                  innerElementType={innerElementType}
                  ref={listRef}
                >
                  {({
                    data: { demos, selectedRows, toggleRowSelected },
                    index,
                    style,
                  }: ListChildComponentProps<ItemDataType>) => (
                    <div
                      style={{
                        ...style,
                        left: (style.left as number) + PADDING_SIZE,
                        top: (style.top as number) + PADDING_SIZE,
                        width: `calc(${style.width} - ${2 * PADDING_SIZE}px)`,
                        height: (style.height as number) - PADDING_SIZE,
                      }}
                    >
                      <DemoListRow
                        demo={demos[index]}
                        selected={selectedRows[index]}
                        selectionMode={selectionMode}
                        onClick={() => toggleRowSelected(index)}
                      />
                    </div>
                  )}
                </FixedSizeList>
              </ScrollArea>
            )}
          </AutoSizer>
        </div>
        <BottomBar
          totalDemoCount={sortedDemos.length}
          totalFileSize={totalFileSize}
          selectedDemoCount={selectedDemoCount}
          selectedFileSize={selectedFileSize}
          selectionMode={selectionMode}
          toggleSelectionMode={() => setSelectionMode(!selectionMode)}
        />
      </div>
    </>
  );
}

export default function HomeViewAsyncWrapper() {
  return (
    <Async
      promiseFn={getDemosInDirectory}
      args={["/home/rasmus/steamapps-common/Team Fortress 2/tf/demos"]}
      loading={
        <Fill>
          <Loader size="lg" variant="dots" />
        </Fill>
      }
      error={(error) => (
        <Fill>
          <Alert color="red">
            An error occured while loading this demo directory: {String(error)}
          </Alert>
        </Fill>
      )}
      success={(result) => <MainView demos={result} />}
    />
  );
}
