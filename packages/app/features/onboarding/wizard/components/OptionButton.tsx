'use client'

import { Button, Paragraph, SizableText, XStack, YStack } from '@my/ui'

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
      <XStack width="100%" justify="space-between" items="center" gap="$3">
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
          <Paragraph fontWeight="700" size="$2" color="$green10" flexShrink={0}>
            Selected
          </Paragraph>
        ) : null}
      </XStack>
    </Button>
  )
}

