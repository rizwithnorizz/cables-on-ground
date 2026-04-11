import React from 'react'
import { Layout } from '@/components/main-layout'
import ReserveList from '@/components/reserve-list'
import ReservationsList from '@/components/reservations-list'

export default function page() {
  return (
   <Layout>
        <ReserveList />
        <ReservationsList />
   </Layout>
  )
}
