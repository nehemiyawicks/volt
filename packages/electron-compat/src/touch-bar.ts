export class TouchBar {
  static readonly TouchBarButton = class { constructor(_opts: unknown) {} };
  static readonly TouchBarLabel = class { constructor(_opts: unknown) {} };
  static readonly TouchBarSpacer = class { constructor(_opts: unknown) {} };
  static readonly TouchBarSlider = class { constructor(_opts: unknown) {} };
  static readonly TouchBarPopover = class { constructor(_opts: unknown) {} };
  static readonly TouchBarGroup = class { constructor(_opts: unknown) {} };
  static readonly TouchBarSegmentedControl = class { constructor(_opts: unknown) {} };
  static readonly TouchBarScrubber = class { constructor(_opts: unknown) {} };
  static readonly TouchBarColorPicker = class { constructor(_opts: unknown) {} };
  static readonly TouchBarOtherItemsProxy = class { constructor(_opts: unknown) {} };

  readonly items: unknown[];
  readonly escapeItem: unknown;

  constructor(options: { items?: unknown[]; escapeItem?: unknown } = {}) {
    this.items = options.items ?? [];
    this.escapeItem = options.escapeItem;
  }
}
