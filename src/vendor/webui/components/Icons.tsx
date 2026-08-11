import type { ComponentType, SVGProps } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Copy,
  Download,
  Ellipsis,
  Eye,
  File,
  Folder,
  FolderPlus,
  Globe,
  Info,
  Image,
  Inbox,
  LoaderCircle,
  KeyRound,
  Maximize2,
  Minimize2,
  Mic,
  MoonStar,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Paperclip,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  SendHorizontal,
  Settings2,
  Smartphone,
  Sparkles,
  Square,
  SunMedium,
  Target,
  Terminal,
  MessageSquareWarning,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
  ListTodo,
} from "lucide-react";

type IconProps = SVGProps<SVGSVGElement>;

function withIcon(Icon: ComponentType<IconProps>) {
  return function WrappedIcon({ strokeWidth, ...props }: IconProps) {
    return <Icon aria-hidden="true" strokeWidth={strokeWidth ?? 1.85} {...props} />;
  };
}

export const PlusIcon = withIcon(Plus);
export const EditIcon = withIcon(Pencil);
export const PanelLeftIcon = withIcon(PanelLeft);
export const PanelRightIcon = withIcon(PanelRight);
export const ProgressPanelIcon = withIcon(ListTodo);
export const BottomPanelIcon = withIcon(PanelBottom);
export const SendIcon = withIcon(SendHorizontal);
export const ArrowUpIcon = withIcon(ArrowUp);
export const ArrowLeftIcon = withIcon(ArrowLeft);
export const ArrowRightIcon = withIcon(ArrowRight);
export const StopIcon = withIcon(Square);
export const PaperclipIcon = withIcon(Paperclip);
export const PauseIcon = withIcon(Pause);
export const PlayIcon = withIcon(Play);
export const GlobeIcon = withIcon(Globe);
export const InfoIcon = withIcon(Info);
export const ImageIcon = withIcon(Image);
export const InboxIcon = withIcon(Inbox);
export const BrainIcon = withIcon(BrainCircuit);
export const CalendarIcon = withIcon(CalendarDays);
export const KeyIcon = withIcon(KeyRound);
export const PencilIcon = withIcon(Pencil);
export const ChevronDownIcon = withIcon(ChevronDown);
export const MoonStarIcon = withIcon(MoonStar);
export const SunIcon = withIcon(SunMedium);
export const SparklesIcon = withIcon(Sparkles);
export const TargetIcon = withIcon(Target);
export const XIcon = withIcon(X);
export const TrashIcon = withIcon(Trash2);
export const SearchIcon = withIcon(Search);
export const SettingsIcon = withIcon(Settings2);
export const EyeIcon = withIcon(Eye);
export const ChevronRightIcon = withIcon(ChevronRight);
export const FileIcon = withIcon(File);
export const FolderIcon = withIcon(Folder);
export const FolderPlusIcon = withIcon(FolderPlus);
export const MoreHorizontalIcon = withIcon(Ellipsis);
export const DownloadIcon = withIcon(Download);
export const TerminalIcon = withIcon(Terminal);
export const FeedbackIcon = withIcon(MessageSquareWarning);
export const CheckCircleIcon = withIcon(CheckCircle2);
export const AlertTriangleIcon = withIcon(CircleAlert);
export const LoaderIcon = withIcon(LoaderCircle);
export const RotateCcwIcon = withIcon(RotateCcw);
export const SmartphoneIcon = withIcon(Smartphone);
export const ExpandIcon = withIcon(Maximize2);
export const CollapseIcon = withIcon(Minimize2);
export const MicIcon = withIcon(Mic);
export const CopyIcon = withIcon(Copy);
export const ThumbsUpIcon = withIcon(ThumbsUp);
export const ThumbsDownIcon = withIcon(ThumbsDown);
