import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PAYMENT_BLOCKED_STATUSES = ['past_due', 'unpaid', 'incomplete_expired']
const PAYMENT_PAGE = '/dashboard/parametres'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Supabase unreachable — allow request through, page-level auth will handle it
  }

  const { pathname } = request.nextUrl
  const isAuthPage      = ['/login', '/signup'].some(p => pathname.startsWith(p))
  const isProtectedPage = pathname.startsWith('/dashboard')

  if (!user && isProtectedPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Block dashboard features when payment has failed, except on the settings page
  if (user && isProtectedPage && !pathname.startsWith(PAYMENT_PAGE)) {
    try {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle()

      if (sub && PAYMENT_BLOCKED_STATUSES.includes(sub.status)) {
        return NextResponse.redirect(new URL(PAYMENT_PAGE, request.url))
      }
    } catch {
      // If check fails, allow through — better UX than a false block
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
