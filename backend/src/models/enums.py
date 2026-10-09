import enum


class PartCode(str, enum.Enum):
    front_full = "front_full"
    forehead_close = "forehead_close"
    left_full = "left_full"
    right_full = "right_full"
    right_rear_oblique = "right_rear_oblique"
    left_rear_oblique = "left_rear_oblique"
    microchip = "microchip"

    @property
    def label(self) -> str:
        return PART_LABELS[self]

    @property
    def order(self) -> int:
        return list(PartCode).index(self) + 1


PART_LABELS: dict[PartCode, str] = {
    PartCode.front_full: "정면전체",
    PartCode.forehead_close: "근접이마",
    PartCode.left_full: "좌측전체",
    PartCode.right_full: "우측전체",
    PartCode.right_rear_oblique: "우후측입체",
    PartCode.left_rear_oblique: "좌후측입체",
    PartCode.microchip: "마이크로칩 증빙",
}

BODY_PARTS: tuple[PartCode, ...] = tuple(p for p in PartCode if p is not PartCode.microchip)


class ChipInputMethod(str, enum.Enum):
    ocr = "ocr"
    manual = "manual"


class FileFormat(str, enum.Enum):
    jpeg = "jpeg"
    png = "png"
