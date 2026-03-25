import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  LevelFormat,
} from "docx";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MessageRow {
  id: string;
  campaign_id: string;
  sequence_order: number;
  channel: string;
  subject: string | null;
  body: string;
  preview_text: string | null;
  cta_text: string | null;
  cta_url: string | null;
  send_at: string | null;
  status: string;
}

interface CampaignRow {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  audience: string | null;
  timezone: string;
  company?: { name: string } | null;
}

function channelColor(channel: string): string {
  switch (channel) {
    case "email": return "2563EB";
    case "sms": return "16A34A";
    case "social": return "9333EA";
    default: return "6B7280";
  }
}

const border = { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function makeHeaderCell(text: string, width: number): TableCell {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: "1F2937", type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, color: "FFFFFF", font: "Arial", size: 20 })],
      }),
    ],
  });
}

function makeCell(text: string, width: number): TableCell {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    margins: cellMargins,
    children: [
      new Paragraph({
        children: [new TextRun({ text, font: "Arial", size: 20 })],
      }),
    ],
  });
}

function formatDate(dateStr: string | null, tz: string): string {
  if (!dateStr) return "Not scheduled";
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      timeZone: tz,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
  } catch {
    return dateStr;
  }
}

export async function POST(request: Request) {
  try {
    const { campaign_ids, message_ids } = await request.json();

    // Load messages
    let messages: MessageRow[] = [];
    if (message_ids && message_ids.length > 0) {
      const { data } = await supabase
        .from("campaign_messages")
        .select("*")
        .in("id", message_ids)
        .order("campaign_id")
        .order("sequence_order");
      messages = (data || []) as MessageRow[];
    } else if (campaign_ids && campaign_ids.length > 0) {
      const { data } = await supabase
        .from("campaign_messages")
        .select("*")
        .in("campaign_id", campaign_ids)
        .order("campaign_id")
        .order("sequence_order");
      messages = (data || []) as MessageRow[];
    }

    // Load campaigns
    const campaignIdsNeeded = [...new Set(messages.map((m) => m.campaign_id))];
    const campaignMap: Record<string, CampaignRow> = {};
    if (campaignIdsNeeded.length > 0) {
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("*, company:companies(name)")
        .in("id", campaignIdsNeeded);
      for (const c of (campaigns || []) as CampaignRow[]) {
        campaignMap[c.id] = c;
      }
    }

    // Group messages by campaign
    const grouped: Record<string, MessageRow[]> = {};
    for (const msg of messages) {
      if (!grouped[msg.campaign_id]) grouped[msg.campaign_id] = [];
      grouped[msg.campaign_id].push(msg);
    }

    const children: Paragraph[] = [];
    const campaignEntries = Object.entries(grouped);

    for (let ci = 0; ci < campaignEntries.length; ci++) {
      const [campaignId, msgs] = campaignEntries[ci];
      const campaign = campaignMap[campaignId];
      const tz = campaign?.timezone || "America/New_York";

      if (ci > 0) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }

      // Campaign title
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: campaign?.name || "Campaign",
              bold: true,
              font: "Arial",
              size: 36,
              color: "111827",
            }),
          ],
        })
      );

      // Campaign meta
      const metaParts: string[] = [];
      if (campaign?.company?.name) metaParts.push(`Company: ${campaign.company.name}`);
      if (campaign?.goal) metaParts.push(`Goal: ${campaign.goal}`);
      if (campaign?.audience) metaParts.push(`Audience: ${campaign.audience}`);
      metaParts.push(`Messages: ${msgs.length}`);

      children.push(
        new Paragraph({
          spacing: { after: 300 },
          children: [
            new TextRun({ text: metaParts.join("  |  "), font: "Arial", size: 20, color: "6B7280", italics: true }),
          ],
        })
      );

      // Each message
      for (const msg of msgs) {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({
                text: `#${msg.sequence_order} — ${msg.channel.toUpperCase()}`,
                bold: true,
                font: "Arial",
                size: 26,
                color: channelColor(msg.channel),
              }),
              new TextRun({
                text: `  ${formatDate(msg.send_at, tz)}`,
                font: "Arial",
                size: 20,
                color: "9CA3AF",
              }),
            ],
          })
        );

        if (msg.subject) {
          children.push(
            new Paragraph({
              spacing: { after: 60 },
              children: [
                new TextRun({ text: "Subject: ", bold: true, font: "Arial", size: 22 }),
                new TextRun({ text: msg.subject, font: "Arial", size: 22 }),
              ],
            })
          );
        }

        // Body
        const bodyLines = msg.body.split("\n");
        for (const line of bodyLines) {
          children.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [new TextRun({ text: line, font: "Arial", size: 20 })],
            })
          );
        }

        if (msg.cta_text) {
          children.push(
            new Paragraph({
              spacing: { before: 100, after: 40 },
              children: [
                new TextRun({ text: "CTA: ", bold: true, font: "Arial", size: 20, color: "2563EB" }),
                new TextRun({ text: msg.cta_text, font: "Arial", size: 20, color: "2563EB" }),
                msg.cta_url
                  ? new TextRun({ text: ` (${msg.cta_url})`, font: "Arial", size: 18, color: "6B7280" })
                  : new TextRun({ text: "" }),
              ],
            })
          );
        }

        if (msg.preview_text) {
          children.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({ text: "Preview: ", bold: true, font: "Arial", size: 18, color: "9CA3AF" }),
                new TextRun({ text: msg.preview_text, font: "Arial", size: 18, color: "9CA3AF", italics: true }),
              ],
            })
          );
        }

        // Divider
        children.push(
          new Paragraph({
            spacing: { before: 200, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB", space: 1 } },
            children: [],
          })
        );
      }
    }

    // Summary table at the end
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
        children: [new TextRun({ text: "Content Summary", bold: true, font: "Arial", size: 32 })],
      })
    );

    const colWidths = [800, 1800, 3000, 2000, 1760];
    const summaryRows = [
      new TableRow({
        children: [
          makeHeaderCell("#", colWidths[0]),
          makeHeaderCell("Channel", colWidths[1]),
          makeHeaderCell("Subject / Preview", colWidths[2]),
          makeHeaderCell("Schedule", colWidths[3]),
          makeHeaderCell("Status", colWidths[4]),
        ],
      }),
      ...messages.map(
        (msg) =>
          new TableRow({
            children: [
              makeCell(String(msg.sequence_order), colWidths[0]),
              makeCell(msg.channel.toUpperCase(), colWidths[1]),
              makeCell(msg.subject || msg.body.slice(0, 60) + "...", colWidths[2]),
              makeCell(
                formatDate(msg.send_at, campaignMap[msg.campaign_id]?.timezone || "America/New_York"),
                colWidths[3]
              ),
              makeCell(msg.status.toUpperCase(), colWidths[4]),
            ],
          })
      ),
    ];

    const summaryTable = new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: colWidths,
      rows: summaryRows,
    });

    const doc = new Document({
      styles: {
        default: { document: { run: { font: "Arial", size: 24 } } },
        paragraphStyles: [
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 36, bold: true, font: "Arial" },
            paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 28, bold: true, font: "Arial" },
            paragraph: { spacing: { before: 180, after: 180 }, outlineLevel: 1 },
          },
        ],
      },
      numbering: {
        config: [
          {
            reference: "bullets",
            levels: [
              {
                level: 0,
                format: LevelFormat.BULLET,
                text: "\u2022",
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 720, hanging: 360 } } },
              },
            ],
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              size: { width: 12240, height: 15840 },
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: "Campaign Export",
                      font: "Arial",
                      size: 16,
                      color: "9CA3AF",
                      italics: true,
                    }),
                  ],
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: "Page ", font: "Arial", size: 16, color: "9CA3AF" }),
                    new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "9CA3AF" }),
                  ],
                }),
              ],
            }),
          },
          children: [...children, summaryTable],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const uint8 = new Uint8Array(buffer);

    return new Response(uint8, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="campaign-export-${Date.now()}.docx"`,
      },
    });
  } catch (err) {
    console.error("DOCX export error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
