import React from "react";
import { Layout } from "@/components/main-layout";
import ReservationsList from "@/components/reservations-list";

export default function page() {
  return (
    <Layout>
      <ReservationsList />
    </Layout>
  );
}
