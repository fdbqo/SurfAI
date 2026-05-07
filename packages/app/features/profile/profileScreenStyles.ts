/**
 * Shared profile sub-screen surfaces and primary actions.
 * Light theme: page is `$background` (light blue); cards use theme `color2` (white per tamagui config).
 */
export const profileCard = {
  bg: '$color2' as const,
  borderWidth: 1,
  borderColor: '$borderColor' as const,
  rounded: '$8' as const,
}

/** Darker blue on hover/press so default grey press state does not flash. */
const primaryBlueInteraction = {
  hoverStyle: {
    backgroundColor: '$blue11' as const,
    borderColor: '$blue11' as const,
  },
  pressStyle: {
    backgroundColor: '$blue12' as const,
    borderColor: '$blue12' as const,
  },
}

export const profilePrimaryButton = {
  backgroundColor: '$blue10' as const,
  borderColor: '$blue10' as const,
  color: '$color1' as const,
  ...primaryBlueInteraction,
}

export const profileBackButton = {
  size: '$3' as const,
  backgroundColor: '$blue10' as const,
  borderColor: '$blue10' as const,
  color: '$color1' as const,
  ...primaryBlueInteraction,
}

/** Outlined CTA on light surfaces (e.g. home “Start setup”) — press stays in blue family, not grey. */
export const profileOutlinedAccentButton = {
  variant: 'outlined' as const,
  backgroundColor: '$color2' as const,
  borderColor: '$blue10' as const,
  color: '$blue11' as const,
  hoverStyle: {
    backgroundColor: '$blue3' as const,
    borderColor: '$blue11' as const,
  },
  pressStyle: {
    backgroundColor: '$blue4' as const,
    borderColor: '$blue12' as const,
  },
}
