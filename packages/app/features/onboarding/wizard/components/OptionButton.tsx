'use client'

import { Button, Paragraph, SizableText, XStack, YStack } from '@my/ui'
import { Check } from '@tamagui/lucide-icons'

export function OptionButton({
  selected,
  onPress,
  title,
  subtitle,
}: {
  selected: boolean
  onPress: () => void
  title: string
  subtitle?: string
}) {
  return (
    <Button
      unstyled
      onPress={onPress}
      width="100%"
      alignItems="flex-start"
      justifyContent="flex-start"
      p="$3"
      rounded="$8"
      borderWidth={1}
      borderColor={selected ? 'rgba(16,185,129,0.35)' : '$borderColor'}
      bg={selected ? 'rgba(16,185,129,0.10)' : '$background'}
      pressStyle={{ opacity: 0.9, borderColor: selected ? 'rgba(16,185,129,0.55)' : '$borderColor' }}
    >
      <XStack width="100%" justify="space-between" gap="$3">
        <YStack gap="$0.5" flex={1}>
          <SizableText fontWeight={selected ? '900' : '800'} size="$4" color={selected ? '$color12' : '$color11'}>
            {title}
          </SizableText>
          {subtitle ? (
            <Paragraph size="$1" color="$color10">
              {subtitle}
            </Paragraph>
          ) : null}
        </YStack>

        {selected ? (
          <YStack
            mt="$0.5"
            bg="rgba(16,185,129,0.18)"
            borderWidth={1}
            borderColor="rgba(16,185,129,0.35)"
            rounded="$10"
            px="$2.5"
            py="$1.5"
            alignItems="center"
            justifyContent="center"
          >
            <XStack items="center" gap="$1.5">
              <Check size={16} color="rgba(16,185,129,0.95)" />
              <Paragraph fontWeight="800" size="$1" color="$green10">
                Selected
              </Paragraph>
            </XStack>
          </YStack>
        ) : null}
      </XStack>
    </Button>
  )
}

