import HeaderV2 from '@/components/landing-v2/HeaderV2'
import FooterV2 from '@/components/landing-v2/FooterV2'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#08090a', minHeight: '100vh', fontFamily: 'var(--font-inter)' }}>
      <HeaderV2 />
      <main>{children}</main>
      <FooterV2 />
    </div>
  )
}
