'use client'

import { Button, Input, Paragraph, XStack, YStack } from '@my/ui'

function clampNum(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function AnyNumberField({
  label,
  value,
  onChange,
  suffix,
  min = -1_000_000,
  max = 1_000_000,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  suffix?: string
  min?: number
  max?: number
}) {
  const isAny = value === null

  return (
    <YStack gap="$2">
      <Paragraph fontWeight="700">{label}</Paragraph>
      <XStack gap="$2" flexWrap="wrap" items="center">
        <Button size="$3" variant={isAny ? undefined : 'outlined'} onPress={() => onChange(isAny ? 0 : null)}>
          Any
        </Button>
        {!isAny ? (
          <>
            <Input
              width={120}
              keyboardType="numeric"
              value={String(value)}
              onChangeText={(t) => {
                const parsed = Number(t)
                if (!Number.isFinite(parsed)) return
                onChange(clampNum(parsed, min, max))
              }}
            />
            {suffix ? (
              <Paragraph size="$3" color="$color10">
                {suffix}
              </Paragraph>
            ) : null}
          </>
        ) : suffix ? (
          <Paragraph size="$3" color="$color10">
            {suffix}
          </Paragraph>
        ) : null}
      </XStack>
    </YStack>
  )
}

