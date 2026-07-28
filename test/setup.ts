import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// RTL only auto-registers this when `globals: true`.
afterEach(cleanup)
