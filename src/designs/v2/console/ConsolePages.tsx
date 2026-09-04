import { API_KEYS, CI_TABLE_ROWS } from "../../console/state"
import { Btn, Card, Empty, Field, Fields, Fig, Figures, FormFoot, Page, Row, Rows, Switch, Table } from "./ConsoleParts"

/**
 * Every page in the console, on one pattern: a title, one plain-English line saying what
 * the page is for, the actions it offers, the readings that matter, then the lists.
 *
 * The content is the old console's, kept as it was. What changed is that each page now
 * says what it is. The old pages opened straight into a grid of numbers, which is fine
 * once you already know the product and useless before that — the single largest thing
 * standing between a new user and this console was that nothing on screen explained what
 * they were looking at.
 */

export type PageId =
  | "dashboard"
  | "billing"
  | "instances"
  | "usage"
  | "competitions"
  | "keys"
  | "users"
  | "machines"
  | "models"
  | "feedback"
  | "audit"
  | "sessions"
  | "settings"

interface Nav {
  go: (p: PageId) => void
}

/* ————————————————— Dashboard ————————————————— */
export function DashboardPage({ go }: Nav) {
  return (
    <Page
      title="Dashboard"
      lede="What you have left to spend, and anything that needs looking at."
      actions={
        <>
          <Btn onClick={() => go("usage")}>Usage breakdown</Btn>
          <Btn primary onClick={() => go("billing")}>
            Add credit
          </Btn>
        </>
      }
    >
      {/* The balance is the reason most people open this page, so it is the first thing
          on it and the largest — the old layout gave it equal billing with a row of
          buttons and a progress bar. */}
      <Card title="Credit" lede="Your remaining balance and what has gone out in the last day.">
        <div className="k-credit">
          <div className="k-credit-fig">
            <span className="k-credit-cur">$</span>163.60
          </div>
          <div className="k-credit-side">
            <div className="k-credit-spent">
              <b>$4.12</b> spent in the past 24 hours
            </div>
            <div className="k-credit-tok">2.31M tokens</div>
          </div>
        </div>
        <div className="k-meter" role="img" aria-label="35% of credit used">
          <span style={{ width: "35%" }} />
        </div>
        <div className="k-meter-l">35% used</div>
      </Card>

      <Card title="Needs your attention" lede="Nothing here means nothing to do. Each line opens the page that fixes it.">
        <Rows>
          <Row name="Instances needing attention" value="0" tag="No issues" tone="ok" onOpen={() => go("instances")} />
          <Row name="Stale heartbeats" note="instances that stopped reporting in" value="0" tag="Heartbeats current" tone="ok" onOpen={() => go("machines")} />
          <Row name="Config drift" note="running settings differ from saved policy" value="0" tag="Matches policy" tone="ok" onOpen={() => go("settings")} />
        </Rows>
      </Card>

      <Card title="Your workspace" lede="Where everything else lives.">
        <Rows>
          <Row name="Instances" note="agents you have deployed" value="12" onOpen={() => go("instances")} />
          <Row name="Machines" note="nodes they run on" value="6" tag="5 providers" onOpen={() => go("machines")} />
          <Row name="Usage" note="tokens, cost and provider records" value="—" onOpen={() => go("usage")} />
        </Rows>
      </Card>
    </Page>
  )
}

/* ————————————————— Billing ————————————————— */
export function BillingPage() {
  return (
    <Page
      title="Billing"
      lede="Add credit and see what you have been charged for."
      actions={<Btn primary>Add credit</Btn>}
    >
      <Figures>
        <Fig label="Available credit" value="$163.60" note="ready to spend" />
        <Fig label="Spent past 24h" value="$4.12" note="2.31M tokens" />
        <Fig label="Used this cycle" value="35%" note="of your balance" />
      </Figures>

      <Card title="Where the credit went" lede="The last full billing window, by what consumed it.">
        <Rows>
          <Row name="Agent sessions" note="model calls made by your agents" value="$52.90" />
          <Row name="Instance runtime" note="time your instances spent running" value="$26.10" />
          <Row name="Storage" note="workspace volumes" value="$7.40" />
        </Rows>
      </Card>

      <Card title="Payment" lede="Credit is bought once and drawn down — there is no subscription.">
        <Rows>
          <Row name="Method" value="None on file" tag="Add one" onOpen={() => {}} />
          <Row name="Billing e-mail" value="scout@logos.dev" />
          <Row name="Invoices" note="receipts for every top-up" value="3" onOpen={() => {}} />
        </Rows>
      </Card>
    </Page>
  )
}

/* ————————————————— Instances ————————————————— */
export function InstancesPage() {
  return (
    <Page
      title="Instances"
      lede="The agents you have deployed. Each one runs on a machine and draws from your credit."
      actions={<Btn primary>+ New instance</Btn>}
    >
      <Figures>
        <Fig label="Running" value="6" note="of 12 deployed" tone="ok" />
        <Fig label="Needs attention" value="0" note="all healthy" />
        <Fig label="Owners" value="6" note="across your org" />
      </Figures>

      <Card title="All instances" lede="Name, identifier and who owns it.">
        <Table head={["Name", "Instance ID", "Owner", "Status", ""]}>
          {CI_TABLE_ROWS.map((r) => (
            <tr key={r.id}>
              <td>
                <span className="k-ava">{r.ava}</span>
                {r.name}
              </td>
              <td>
                <code>{r.id}</code>
              </td>
              <td>{r.owner}</td>
              <td>
                <span className="k-dot ok" /> running
              </td>
              <td className="k-td-act">
                <button className="k-linkbtn" type="button">
                  Open
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </Page>
  )
}

/* ————————————————— Usage ————————————————— */
export function UsagePage() {
  return (
    <Page
      title="Usage"
      lede="How many tokens you have used, what they cost, and the raw provider records behind it."
      actions={
        <>
          <Btn>Refresh</Btn>
          <Btn primary>Export CSV</Btn>
        </>
      }
    >
      <Figures>
        <Fig label="Input tokens" value="0" note="sent to models" />
        <Fig label="Output tokens" value="0" note="returned by models" />
        <Fig label="Estimated cost" value="$0.00" note="for 2026-07-13" />
      </Figures>

      <Card title="Where the credit went" lede="The current window, by what consumed it.">
        <Rows>
          <Row name="Agent sessions" value="$52.90" />
          <Row name="Instance runtime" value="$26.10" />
          <Row name="Storage" value="$7.40" />
        </Rows>
      </Card>

      <Card title="Records" lede="Daily rollups and the provider data they are built from.">
        <Rows>
          <Row name="Daily rollup" note="one row per day" value="0" tag="0 visible" onOpen={() => {}} />
          <Row name="Provider records" note="raw billing rows from each provider" value="0" onOpen={() => {}} />
          <Row name="Request lookup" note="find a single request by id" value="2026-07-13" onOpen={() => {}} />
          <Row name="CSV import" value="Enabled" tag="0 rows" tone="ok" onOpen={() => {}} />
          <Row name="CSV export" note="latest 100 records" value="CSV" onOpen={() => {}} />
        </Rows>
      </Card>

      <Card title="Signals" lede="The shape of your usage, rather than the totals.">
        <Rows>
          <Row name="Input share" value="0%" tag="0 tokens" />
          <Row name="Output share" value="0%" tag="0 tokens" />
          <Row name="Cost window" value="$0.00" tag="2026-07-13" />
          <Row name="Daily rows" value="0" tag="0 total" />
        </Rows>
      </Card>
    </Page>
  )
}

/* ————————————————— Competitions ————————————————— */
export function CompetitionsPage() {
  return (
    <Page title="Competitions" lede="Benchmarks your agents are entered in, and where they placed.">
      <Empty what="You are not entered in a competition yet. When you are, your score, rank and any appeals will appear here." />
    </Page>
  )
}

/* ————————————————— API keys ————————————————— */
export function KeysPage() {
  return (
    <Page
      title="API keys"
      lede="Keys that let your own code call LOGOS. Each one carries its own budget."
      actions={<Btn primary>+ Create key</Btn>}
    >
      <Figures>
        <Fig label="Active keys" value="12" note="0 disabled" tone="ok" />
        <Fig label="Budget" value="$0.00" note="configured limit" />
        <Fig label="Used" value="$1531.32" note="over configured limit" tone="warn" />
      </Figures>

      <Card title="Keys" lede="Status, spend and token activity for each key.">
        <Table head={["Name", "Key", "Status", "Budget", "Tokens", "Created", ""]}>
          {API_KEYS.map((k) => (
            <tr key={k.name}>
              <td>{k.name}</td>
              <td>
                <code>{k.key}</code>
              </td>
              <td>
                <span className={"k-dot " + k.dot} />
                {k.status}
              </td>
              <td className="num">{k.budget}</td>
              <td className="num">{k.tokens}</td>
              <td>{k.created}</td>
              <td className="k-td-act">
                <button className="k-linkbtn" type="button">
                  {k.action}
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card title="Totals" lede="Across every key, including ones you have deleted.">
        <Rows>
          <Row name="Active" value="12" tag="0 disabled" tone="ok" />
          <Row name="Deleted" note="excluded from the count above" value="11" />
          <Row name="Used budget" value="$1531.32" tag="over configured limit" tone="warn" />
          <Row name="Tokens" note="input and output combined" value="459,538,097" />
        </Rows>
      </Card>
    </Page>
  )
}

/* ————————————————— Users ————————————————— */
export function UsersPage() {
  return (
    <Page
      title="Users"
      lede="Everyone with an account on this platform, and what they are allowed to do."
      actions={<Btn primary>+ Create user</Btn>}
    >
      <Figures>
        <Fig label="Users" value="45" note="platform accounts" />
        <Fig label="Active now" value="7" note="signed in" tone="ok" />
        <Fig label="Admins" value="23" note="full access" />
      </Figures>

      <Card title="Manage" lede="Roles, balances, instance limits and live sessions.">
        <Rows>
          <Row name="Accounts" note="create, edit and disable users" value="45" onOpen={() => {}} />
          <Row name="Admin roles" note="who has full platform access" value="23" onOpen={() => {}} />
          <Row name="Balance ledger" note="credit held across all accounts" value="$10,668.72" onOpen={() => {}} />
          <Row name="Instance limits" value="12 / 146" tag="active / max" tone="warn" onOpen={() => {}} />
          <Row name="Active sessions" value="37" onOpen={() => {}} />
        </Rows>
      </Card>
    </Page>
  )
}

/* ————————————————— Machines ————————————————— */
export function MachinesPage() {
  return (
    <Page
      title="Machines"
      lede="The hardware your instances run on — nodes, who provides them, and how they are pooled."
      actions={
        <>
          <Btn>Reconcile capacity</Btn>
          <Btn primary>+ New node</Btn>
        </>
      }
    >
      <Figures>
        <Fig label="Machines" value="6" note="deployment nodes" />
        <Fig label="Providers" value="2" note="supplying them" />
        <Fig label="Pools" value="2" note="capacity groups" />
        <Fig label="Healthy" value="1" note="reporting ok" tone="ok" />
      </Figures>

      <Card title="Manage" lede="Nodes, providers, pools and the cost ledger behind them.">
        <Rows>
          <Row name="Nodes" note="individual machines" value="6" onOpen={() => {}} />
          <Row name="Providers" note="who the hardware comes from" value="2" onOpen={() => {}} />
          <Row name="Pools" note="how capacity is grouped" value="2" onOpen={() => {}} />
          <Row name="Provider machines" value="0" tag="5 tracked" onOpen={() => {}} />
          <Row name="Capacity requests" value="2" tag="0 failed" onOpen={() => {}} />
          <Row name="Cost ledger" note="what the fleet is costing" value="—" onOpen={() => {}} />
        </Rows>
      </Card>

      <Card title="Capacity" lede="What is free right now, and what is waiting.">
        <Rows>
          <Row name="Available slots" value="0 / 16" tag="deployment capacity" tone="warn" />
          <Row name="CPU reservation" value="24 / 41" tag="reserved / total" />
          <Row name="Pending requests" value="2" tag="0 failed" />
          <Row name="Provider fleet" value="0" tag="5 tracked" />
        </Rows>
      </Card>
    </Page>
  )
}

/* ————————————————— Settings ————————————————— */
export function SettingsPage() {
  return (
    <Page
      title="Settings"
      lede="Defaults applied to new accounts and new instances. Existing ones are not changed."
    >
      <Card
        title="Who can sign up"
        lede="Whether the login screen offers account creation to the public."
      >
        <Switch label="Public registration" note="anyone with the link can create an account" />
        <Rows>
          <Row name="Current policy" value="Closed" />
          <Row name="Last changed by" value="—" />
          <Row name="Last changed at" value="—" />
        </Rows>
        <Fields>
          <Field label="Audit reason" defaultValue="Updated from web-ui template" />
        </Fields>
        <FormFoot>
          <Btn>Reset</Btn>
          <Btn primary>Save</Btn>
        </FormFoot>
      </Card>

      <Card title="What new accounts get" lede="Starting credit and how many instances they may run at once.">
        <Fields>
          <Field label="Starting credit (USD)" defaultValue="100" hint="0 or greater" />
          <Field label="Max active instances" defaultValue="5" hint="0 or greater" />
          <Field label="Audit reason" defaultValue="Updated from web-ui template" />
        </Fields>
        <FormFoot>
          <Btn>Reset</Btn>
          <Btn primary>Save</Btn>
        </FormFoot>
      </Card>

      <Card title="What new instances get" lede="The default machine allocation. Applies to new instances only.">
        <Fields>
          <Field label="CPU cores" defaultValue="2" hint="greater than 0" />
          <Field label="Memory (GB)" defaultValue="8" hint="greater than 0" />
          <Field label="Workspace (GB)" defaultValue="100" hint="greater than 0" />
        </Fields>
        <Rows>
          <Row name="Applies to" value="New instances" />
          <Row name="Last changed by" value="user_000001" />
          <Row name="Last changed at" value="2026/6/21 00:07" />
        </Rows>
        <FormFoot>
          <Btn>Reset</Btn>
          <Btn primary>Save</Btn>
        </FormFoot>
      </Card>
    </Page>
  )
}

/* ————————————————— not built yet ————————————————— */
export function SoonPage({ title, lede, what }: { title: string; lede: string; what: string }) {
  return (
    <Page title={title} lede={lede}>
      <Empty what={what} />
    </Page>
  )
}
