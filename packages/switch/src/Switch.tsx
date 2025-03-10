// via radix
// https://github.com/radix-ui/primitives/blob/main/packages/react/switch/src/Switch.tsx

import { usePrevious } from '@radix-ui/react-use-previous'
import { useComposedRefs } from '@tamagui/compose-refs'
import {
  GetProps,
  SizeTokens,
  getVariableValue,
  isWeb,
  styled,
  withStaticProperties,
} from '@tamagui/core'
import { ScopedProps, createContextScope } from '@tamagui/create-context'
import { registerFocusable } from '@tamagui/focusable'
import { getSize } from '@tamagui/get-size'
import { useLabelContext } from '@tamagui/label'
import { ThemeableStack, XStack } from '@tamagui/stacks'
import { useControllableState } from '@tamagui/use-controllable-state'
import * as React from 'react'
import { View } from 'react-native'

const SWITCH_NAME = 'Switch'

// TODO make customizable
const getSwitchHeight = (val: SizeTokens) =>
  Math.round(getVariableValue(getSize(val)) * 0.65)
const getSwitchWidth = (val: SizeTokens) => getSwitchHeight(val) * 2

const scopeContexts = createContextScope(SWITCH_NAME)
const [createSwitchContext] = scopeContexts
export const createSwitchScope = scopeContexts[1]

const [SwitchProvider, useSwitchContext] = createSwitchContext<{
  checked: boolean
  disabled?: boolean
  size: SizeTokens
  unstyled?: boolean
}>(SWITCH_NAME)

/* -------------------------------------------------------------------------------------------------
 * SwitchThumb
 * -----------------------------------------------------------------------------------------------*/

const THUMB_NAME = 'SwitchThumb'

export const SwitchThumbFrame = styled(ThemeableStack, {
  name: 'SwitchThumb',

  variants: {
    unstyled: {
      false: {
        size: '$true',
        backgroundColor: '$background',
        borderRadius: 1000,
      },
    },

    size: {
      '...size': (val) => {
        const size = getSwitchHeight(val)
        return {
          height: size,
          width: size,
        }
      },
    },
  } as const,

  defaultVariants: {
    unstyled: false,
  },
})

export type SwitchThumbProps = GetProps<typeof SwitchThumbFrame>

export const SwitchThumb = SwitchThumbFrame.extractable(
  React.forwardRef<React.ElementRef<'span'>, SwitchThumbProps>(
    (props: ScopedProps<SwitchThumbProps, 'Switch'>, forwardedRef) => {
      const { __scopeSwitch, size: sizeProp, ...thumbProps } = props
      const {
        size: sizeContext,
        disabled,
        checked,
        unstyled,
      } = useSwitchContext(THUMB_NAME, __scopeSwitch)
      const size = sizeProp ?? sizeContext
      return (
        <SwitchThumbFrame
          size={size}
          theme={checked ? 'active' : null}
          data-state={getState(checked)}
          data-disabled={disabled ? '' : undefined}
          {...thumbProps}
          x={
            checked
              ? getVariableValue(getSwitchWidth(size)) -
                getVariableValue(getSwitchHeight(size))
              : 0
          }
          ref={forwardedRef}
        />
      )
    }
  )
)

SwitchThumb.displayName = THUMB_NAME

/* -------------------------------------------------------------------------------------------------
 * Switch
 * -----------------------------------------------------------------------------------------------*/

export const SwitchFrame = styled(XStack, {
  name: SWITCH_NAME,
  tag: 'button',

  variants: {
    unstyled: {
      false: {
        // size: '$true',
        // borderRadius: 1000,
        // borderWidth: 2,
        // borderColor: 'transparent',
        // backgroundColor: '$background',

        focusStyle: {
          borderColor: '$borderColorFocus',
        },
      },
    },

    size: {
      '...size': (val) => {
        const height = getSwitchHeight(val) + 4
        const width = getSwitchWidth(val) + 4
        return {
          height,
          minHeight: height,
          width,
        }
      },
    },
  } as const,

  defaultVariants: {
    unstyled: false,
  },
})

type SwitchButtonProps = GetProps<typeof SwitchFrame>

export type SwitchProps = SwitchButtonProps & {
  labeledBy?: string
  name?: string
  value?: string
  checked?: boolean
  defaultChecked?: boolean
  required?: boolean
  onCheckedChange?(checked: boolean): void
}

export const Switch = withStaticProperties(
  SwitchFrame.extractable(
    React.forwardRef<HTMLButtonElement | View, SwitchProps>(
      (props: ScopedProps<SwitchProps, 'Switch'>, forwardedRef) => {
        const {
          __scopeSwitch,
          labeledBy: ariaLabelledby,
          name,
          checked: checkedProp,
          defaultChecked,
          required,
          disabled,
          value = 'on',
          onCheckedChange,
          size = '$true',
          unstyled = false,
          ...switchProps
        } = props
        const [button, setButton] = React.useState<HTMLButtonElement | null>(null)
        const composedRefs = useComposedRefs(forwardedRef, (node) =>
          setButton(node as any)
        )
        const labelId = useLabelContext(button)
        const labelledBy = ariaLabelledby || labelId
        const hasConsumerStoppedPropagationRef = React.useRef(false)
        // We set this to true by default so that events bubble to forms without JS (SSR)
        const isFormControl = isWeb
          ? button
            ? Boolean(button.closest('form'))
            : true
          : false
        const [checked = false, setChecked] = useControllableState({
          prop: checkedProp,
          defaultProp: defaultChecked || false,
          onChange: onCheckedChange,
          transition: true,
        })

        if (!isWeb) {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          React.useEffect(() => {
            if (!props.id) return
            return registerFocusable(props.id, {
              focus: () => {
                setChecked((x) => !x)
              },
            })
          }, [props.id, setChecked])
        }

        return (
          <SwitchProvider
            scope={__scopeSwitch}
            checked={checked}
            disabled={disabled}
            size={size}
            unstyled={unstyled}
          >
            <SwitchFrame
              unstyled={unstyled}
              size={size}
              // @ts-ignore
              role="switch"
              aria-checked={checked}
              aria-labelledby={labelledBy}
              aria-required={required}
              data-state={getState(checked)}
              data-disabled={disabled ? '' : undefined}
              disabled={disabled}
              theme={checked ? 'active' : null}
              themeShallow
              // @ts-ignore
              tabIndex={disabled ? undefined : 0}
              // @ts-ignore
              value={value}
              {...switchProps}
              ref={composedRefs}
              onPress={(event) => {
                props.onPress?.(event)
                setChecked((prevChecked) => !prevChecked)
                if (isWeb && isFormControl) {
                  hasConsumerStoppedPropagationRef.current = event.isPropagationStopped()
                  // if switch is in a form, stop propagation from the button so that we only propagate
                  // one click event (from the input). We propagate changes from an input so that native
                  // form validation works and form events reflect switch updates.
                  if (!hasConsumerStoppedPropagationRef.current) event.stopPropagation()
                }
              }}
            />
            {isWeb && isFormControl && (
              <BubbleInput
                control={button}
                bubbles={!hasConsumerStoppedPropagationRef.current}
                name={name}
                value={value}
                checked={checked}
                required={required}
                disabled={disabled}
                // We transform because the input is absolutely positioned but we have
                // rendered it **after** the button. This pulls it back to sit on top
                // of the button.
                style={{ transform: 'translateX(-100%)' }}
              />
            )}
          </SwitchProvider>
        )
      }
    )
  ),
  {
    Thumb: SwitchThumb,
  }
)

/* ---------------------------------------------------------------------------------------------- */

type InputProps = any //Radix.ComponentPropsWithoutRef<'input'>
interface BubbleInputProps extends Omit<InputProps, 'checked'> {
  checked: boolean
  control: HTMLElement | null
  bubbles: boolean
}

// TODO make this native friendly
const BubbleInput = (props: BubbleInputProps) => {
  const { control, checked, bubbles = true, ...inputProps } = props
  const ref = React.useRef<HTMLInputElement>(null)
  const prevChecked = usePrevious(checked)
  // const controlSize = useSize(control)

  // Bubble checked change to parents (e.g form change event)
  React.useEffect(() => {
    const input = ref.current!
    const inputProto = window.HTMLInputElement.prototype
    const descriptor = Object.getOwnPropertyDescriptor(
      inputProto,
      'checked'
    ) as PropertyDescriptor
    const setChecked = descriptor.set
    if (prevChecked !== checked && setChecked) {
      const event = new Event('click', { bubbles })
      setChecked.call(input, checked)
      input.dispatchEvent(event)
    }
  }, [prevChecked, checked, bubbles])

  return (
    <input
      type="checkbox"
      aria-hidden
      defaultChecked={checked}
      {...inputProps}
      tabIndex={-1}
      ref={ref}
      style={{
        ...props.style,
        // ...controlSize,
        position: 'absolute',
        pointerEvents: 'none',
        opacity: 0,
        margin: 0,
      }}
    />
  )
}

function getState(checked: boolean) {
  return checked ? 'checked' : 'unchecked'
}
