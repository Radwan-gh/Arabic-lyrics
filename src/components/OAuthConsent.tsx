import Link from "next/link";
import { KeyRound, TriangleAlert } from "lucide-react";
import type { Role } from "@prisma/client";
import { focusRing } from "@/lib/ui";

const ROLE_LABELS: Record<Role, string> = { ADMIN: "مدير", EDITOR: "محرر", VIEWER: "مشاهد" };

// ما يتيحه الربط حسب الدور — يطابق قواعد أدوات MCP (src/lib/mcp/server.ts).
const ROLE_GRANTS: Record<Role, string> = {
  ADMIN: "البحث في الأناشيد وقراءتها، وإضافتها وتعديل أيّ منها، وإدارة وصلاتك.",
  EDITOR: "البحث في الأناشيد وقراءتها، وإضافة أناشيد جديدة وتعديل ما أضفته، وإدارة وصلاتك.",
  VIEWER: "البحث في الأناشيد وقراءتها، وإدارة وصلاتك.",
};

const shell =
  "flex min-h-dvh flex-col justify-center gap-[22px] bg-[#f7f7f4] px-7 text-[#14211c] sm:mx-auto sm:min-h-0 sm:max-w-sm sm:bg-transparent sm:px-0 sm:py-10";

const bigBtn = `inline-flex h-[54px] w-full items-center justify-center rounded-2xl text-[17px] font-bold transition-colors ${focusRing}`;

interface ConsentProps {
  clientName: string;
  redirectHost: string;
  userName: string;
  role: Role;
  /** معاملات طلب التفويض بعد التحقق، تُعاد كما هي مع القرار. */
  fields: Record<string, string>;
}

/** شاشة الموافقة على ربط تطبيق MCP (مثل Claude) بحساب المستخدم. نموذج HTML عادي بلا JavaScript. */
export function OAuthConsent({ clientName, redirectHost, userName, role, fields }: ConsentProps) {
  return (
    <div className={shell}>
      <div className="flex flex-col items-start gap-2">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-[18px] bg-emerald-700 text-white">
          <KeyRound className="h-[26px] w-[26px]" aria-hidden="true" />
        </span>
        <h1 className="mt-2 text-[28px] font-extrabold sm:text-2xl">
          ربط <bdi>{clientName}</bdi> بحسابك
        </h1>
        <p className="text-[15px] leading-[1.8] text-[#6b7670]">
          يطلب هذا التطبيق الوصول إلى «نفحات» باسمك وبصلاحياتك: {ROLE_GRANTS[role]}
        </p>
      </div>

      <dl className="flex flex-col gap-3 rounded-2xl border border-[#e6e6e1] bg-white p-4 text-[15px]">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[#6b7670]">الحساب</dt>
          <dd className="truncate font-semibold">
            {userName} <span className="font-normal text-[#6b7670]">({ROLE_LABELS[role]})</span>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[#6b7670]">العودة إلى</dt>
          <dd dir="ltr" className="truncate font-semibold">
            {redirectHost}
          </dd>
        </div>
      </dl>

      <form method="post" action="/api/oauth/authorize" className="flex flex-col gap-3">
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <button type="submit" name="decision" value="allow" className={`${bigBtn} bg-emerald-700 text-white hover:bg-emerald-800`}>
          السماح
        </button>
        <button
          type="submit"
          name="decision"
          value="deny"
          className={`${bigBtn} border border-[#e6e6e1] bg-white text-[#3c4a44] hover:bg-[#f2f2ee]`}
        >
          رفض
        </button>
      </form>

      <p className="text-sm leading-[1.8] text-[#6b7670]">
        لا تسمح إلا إذا كنت أنت من بدأ الربط الآن. يمكنك إيقاف الوصول لاحقاً بحذف الخادم من التطبيق.
      </p>
    </div>
  );
}

/** طلب ربط لا يمكن الوثوق بعنوان عودته: تُعرض المشكلة هنا بدل التوجيه. */
export function OAuthError({ message }: { message: string }) {
  return (
    <div className={shell}>
      <div className="flex flex-col items-start gap-2">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-[18px] bg-red-50 text-red-700">
          <TriangleAlert className="h-[26px] w-[26px]" aria-hidden="true" />
        </span>
        <h1 className="mt-2 text-[28px] font-extrabold sm:text-2xl">تعذّر إتمام الربط</h1>
        <p role="alert" className="text-[15px] leading-[1.8] text-[#6b7670]">
          {message}
        </p>
      </div>
      <Link href="/" className={`self-start text-[15px] font-semibold text-emerald-700 ${focusRing}`}>
        العودة إلى الرئيسية
      </Link>
    </div>
  );
}
