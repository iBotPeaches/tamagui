import type { Scope } from '@tamagui/create-context'
import { createContextScope } from '@tamagui/create-context'
import { getButtonSized } from '@tamagui/get-button-sized'
import { Group, GroupProps, useGroupItem } from '@tamagui/group'
import { RovingFocusGroup, createRovingFocusGroupScope } from '@tamagui/roving-focus'
import { SizableStack, ThemeableStack, ThemeableStackProps } from '@tamagui/stacks'
import { useControllableState } from '@tamagui/use-controllable-state'
import { useDirection } from '@tamagui/use-direction'
import {
  GetProps,
  SizeTokens,
  Theme,
  composeEventHandlers,
  composeRefs,
  isWeb,
  styled,
  useId,
  withStaticProperties,
} from '@tamagui/web'
import * as React from 'react'
import type { LayoutRectangle } from 'react-native'

/* -------------------------------------------------------------------------------------------------
 * TabsList
 * -----------------------------------------------------------------------------------------------*/

const TAB_LIST_NAME = 'TabsList'

const TabsListFrame = styled(Group, {
  name: TAB_LIST_NAME,
  focusable: true,
  // defaultVariants: {
  //   flexGrow: 0,
  // },
})

type TabsListFrameProps = GroupProps

type TabsListProps = TabsListFrameProps & {
  /**
   * Whether to loop over after reaching the end or start of the items
   * @default true
   */
  loop?: boolean
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  (props: ScopedProps<TabsListProps>, forwardedRef) => {
    const { __scopeTabs, loop = true, children, ...listProps } = props
    const context = useTabsContext(TAB_LIST_NAME, __scopeTabs)
    const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeTabs)

    return (
      <RovingFocusGroup
        asChild
        orientation={context.orientation}
        dir={context.dir}
        loop={loop}
        {...rovingFocusGroupScope}
      >
        <TabsListFrame
          role="tablist"
          aria-orientation={context.orientation}
          ref={forwardedRef}
          axis={context.orientation}
          {...listProps}
        >
          {children}
        </TabsListFrame>
      </RovingFocusGroup>
    )
  }
)

TabsList.displayName = TAB_LIST_NAME

/* -------------------------------------------------------------------------------------------------
 * TabsTrigger
 * -----------------------------------------------------------------------------------------------*/

const TRIGGER_NAME = 'TabsTrigger'

const TabsTriggerFrame = styled(ThemeableStack, {
  name: TRIGGER_NAME,
  justifyContent: 'center',
  alignItems: 'center',
  flexWrap: 'nowrap',
  flexDirection: 'row',
  cursor: 'pointer',

  variants: {
    size: {
      '...size': getButtonSized,
    },
    disabled: {
      true: {
        pointerEvents: 'none',
      },
    },
    theme: {
      Button: {
        focusable: true,
        hoverTheme: true,
        pressTheme: true,
        backgrounded: true,
        borderWidth: 1,
        borderColor: 'transparent',

        pressStyle: {
          borderColor: 'transparent',
        },

        hoverStyle: {
          borderColor: 'transparent',
        },

        focusStyle: {
          borderColor: '$borderColorFocus',
        },
      },
    },
  },
})

type TabTriggerLayout = LayoutRectangle
type InteractionType = 'select' | 'focus' | 'hover'

type TabsTriggerFrameProps = ThemeableStackProps
type TabsTriggerProps = TabsTriggerFrameProps & {
  /** The value for the tabs state to be changed to after activation of the trigger */
  value: string

  /** Used for making custom indicators when trigger interacted with */
  onInteraction?: (type: InteractionType, layout: TabTriggerLayout | null) => void
}

const TabsTrigger = TabsTriggerFrame.extractable(
  React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
    (props: ScopedProps<TabsTriggerProps>, forwardedRef) => {
      const {
        __scopeTabs,
        value,
        disabled = false,
        onInteraction,
        ...triggerProps
      } = props
      const context = useTabsContext(TRIGGER_NAME, __scopeTabs)
      const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeTabs)
      const triggerId = makeTriggerId(context.baseId, value)
      const contentId = makeContentId(context.baseId, value)
      const isSelected = value === context.value
      const [layout, setLayout] = React.useState<TabTriggerLayout | null>(null)
      const triggerRef = React.useRef<HTMLButtonElement>(null)
      const groupItemProps = useGroupItem({ disabled })
      React.useEffect(() => {
        if (!triggerRef.current || !isWeb) return

        function getTriggerSize() {
          if (!triggerRef.current) return
          setLayout({
            width: triggerRef.current.offsetWidth,
            height: triggerRef.current.offsetHeight,
            x: triggerRef.current.offsetLeft,
            y: triggerRef.current.offsetTop,
          })
        }
        getTriggerSize()

        const observer = new ResizeObserver(getTriggerSize)
        observer.observe(triggerRef.current)

        return () => {
          if (!triggerRef.current) return
          observer.unobserve(triggerRef.current)
        }
      }, [])

      React.useEffect(() => {
        if (isSelected && layout) {
          onInteraction?.('select', layout)
        }
      }, [isSelected, value, layout])

      return (
        <Theme forceClassName name={isSelected ? 'active' : null}>
          <RovingFocusGroup.Item
            asChild
            {...rovingFocusGroupScope}
            focusable={!disabled}
            active={isSelected}
          >
            <TabsTriggerFrame
              onLayout={(event) => {
                if (!isWeb) {
                  setLayout(event.nativeEvent.layout)
                }
              }}
              onHoverIn={composeEventHandlers(props.onHoverIn, () => {
                if (layout) {
                  onInteraction?.('hover', layout)
                }
              })}
              onHoverOut={composeEventHandlers(props.onHoverOut, () => {
                onInteraction?.('hover', null)
              })}
              role="tab"
              aria-selected={isSelected}
              aria-controls={contentId}
              data-state={isSelected ? 'active' : 'inactive'}
              data-disabled={disabled ? '' : undefined}
              disabled={disabled}
              id={triggerId}
              // @ts-ignore
              size={context.size}
              {...triggerProps}
              ref={composeRefs(forwardedRef, triggerRef)}
              onPress={composeEventHandlers(props.onPress ?? undefined, (event) => {
                // only call handler if it's the left button (mousedown gets triggered by all mouse buttons)
                // but not when the control key is pressed (avoiding MacOS right click)

                const webChecks =
                  !isWeb ||
                  ((event as unknown as React.MouseEvent).button === 0 &&
                    (event as unknown as React.MouseEvent).ctrlKey === false)
                if (!disabled && !isSelected && webChecks) {
                  context.onChange(value)
                } else {
                  // prevent focus to avoid accidental activation
                  event.preventDefault()
                }
              })}
              {...(isWeb && {
                type: 'button',
                onKeyDown: composeEventHandlers(
                  (props as React.HTMLProps<HTMLButtonElement>).onKeyDown,
                  (event) => {
                    if ([' ', 'Enter'].includes(event.key)) {
                      context.onChange(value)
                    }
                  }
                ),
                onFocus: composeEventHandlers(props.onFocus, (event) => {
                  if (layout) {
                    onInteraction?.('focus', layout)
                  }
                  // handle "automatic" activation if necessary
                  // ie. activate tab following focus
                  const isAutomaticActivation = context.activationMode !== 'manual'
                  if (!isSelected && !disabled && isAutomaticActivation) {
                    context.onChange(value)
                  }
                }),
                onBlur: composeEventHandlers(props.onFocus, () => {
                  onInteraction?.('focus', null)
                }),
              })}
              {...groupItemProps}
            />
          </RovingFocusGroup.Item>
        </Theme>
      )
    }
  )
)

TabsTrigger.displayName = TRIGGER_NAME

/* -------------------------------------------------------------------------------------------------
 * TabsContent
 * -----------------------------------------------------------------------------------------------*/

const CONTENT_NAME = 'TabsContent'

const TabsContentFrame = styled(ThemeableStack, {
  name: CONTENT_NAME,
})
type TabsContentFrameProps = GetProps<typeof TabsContentFrame>
type TabsContentProps = TabsContentFrameProps & {
  /** Will show the content when the value matches the state of Tabs root */
  value: string

  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Tamagui animations.
   */
  forceMount?: true
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  (props: ScopedProps<TabsContentProps>, forwardedRef) => {
    const { __scopeTabs, value, forceMount, children, ...contentProps } = props
    const context = useTabsContext(CONTENT_NAME, __scopeTabs)
    const isSelected = value === context.value
    const show = forceMount || isSelected

    const triggerId = makeTriggerId(context.baseId, value)
    const contentId = makeContentId(context.baseId, value)

    if (!show) return null
    return (
      <TabsContentFrame
        key={value}
        data-state={isSelected ? 'active' : 'inactive'}
        data-orientation={context.orientation}
        role="tabpanel"
        aria-labelledby={triggerId}
        // @ts-ignore
        hidden={!show}
        id={contentId}
        tabIndex={0}
        {...contentProps}
        ref={forwardedRef}
      >
        {children}
      </TabsContentFrame>
    )
  }
)

TabsContent.displayName = CONTENT_NAME

/* -------------------------------------------------------------------------------------------------
 * Tabs
 * -----------------------------------------------------------------------------------------------*/

const TABS_NAME = 'Tabs'

type ScopedProps<P> = P & { __scopeTabs?: Scope }
const [createTabsContext, createTabsScope] = createContextScope(TABS_NAME, [
  createRovingFocusGroupScope,
])
const useRovingFocusGroupScope = createRovingFocusGroupScope()

type TabsContextValue = {
  baseId: string
  value?: string
  onChange: (value: string) => void
  orientation?: TabsProps['orientation']
  dir?: TabsProps['dir']
  activationMode?: TabsProps['activationMode']
  size: SizeTokens
}

const [TabsProvider, useTabsContext] = createTabsContext<TabsContextValue>(TABS_NAME)

const TabsFrame = styled(SizableStack, {
  name: TABS_NAME,
})
type RovingFocusGroupProps = React.ComponentPropsWithoutRef<typeof RovingFocusGroup>
type TabsFrameProps = GetProps<typeof TabsFrame>
type TabsProps = TabsFrameProps & {
  /** The value for the selected tab, if controlled */
  value?: string
  /** The value of the tab to select by default, if uncontrolled */
  defaultValue?: string
  /** A function called when a new tab is selected */
  onValueChange?: (value: string) => void
  /**
   * The orientation the tabs are layed out.
   * Mainly so arrow navigation is done accordingly (left & right vs. up & down)
   * @defaultValue horizontal
   */
  orientation?: RovingFocusGroupProps['orientation']
  /**
   * The direction of navigation between toolbar items.
   */
  dir?: RovingFocusGroupProps['dir']
  /**
   * Whether a tab is activated automatically or manually. Only supported in web.
   * @defaultValue automatic
   * */
  activationMode?: 'automatic' | 'manual'
}

export const Tabs = withStaticProperties(
  React.forwardRef<HTMLDivElement, TabsProps>(
    (props: ScopedProps<TabsProps>, forwardedRef) => {
      const {
        __scopeTabs,
        value: valueProp,
        onValueChange,
        defaultValue,
        orientation = 'horizontal',
        dir,
        activationMode = 'automatic',
        size = '$true',
        ...tabsProps
      } = props
      const direction = useDirection(dir)
      const [value, setValue] = useControllableState({
        prop: valueProp,
        onChange: onValueChange,
        defaultProp: defaultValue ?? '',
      })

      return (
        <TabsProvider
          scope={__scopeTabs}
          baseId={useId()}
          value={value}
          onChange={setValue}
          orientation={orientation}
          dir={direction}
          activationMode={activationMode}
          size={size}
        >
          <TabsFrame
            direction={direction}
            //   dir={direction}
            data-orientation={orientation}
            {...tabsProps}
            ref={forwardedRef}
          />
        </TabsProvider>
      )
    }
  ),
  {
    List: TabsList,
    Trigger: TabsTrigger,
    Content: TabsContent,
  }
)

Tabs.displayName = TABS_NAME

/* ---------------------------------------------------------------------------------------------- */

function makeTriggerId(baseId: string, value: string) {
  return `${baseId}-trigger-${value}`
}

function makeContentId(baseId: string, value: string) {
  return `${baseId}-content-${value}`
}

export type {
  TabsProps,
  TabsListProps,
  TabsTriggerProps,
  TabsContentProps,
  TabTriggerLayout,
}
