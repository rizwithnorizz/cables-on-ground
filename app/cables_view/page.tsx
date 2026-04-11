import React from "react";
import { Layout } from "@/components/main-layout";
import { DrumsTable } from "@/components/drums-table";

export default function page() {
  return (
    <Layout>
      <DrumsTable />
    </Layout>
  );
}
