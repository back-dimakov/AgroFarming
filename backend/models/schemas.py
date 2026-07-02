from pydantic import BaseModel, Field
from typing import Optional, List

class OfferBase(BaseModel):
    user_name: str = Field(..., description="Имя фермера")
    crop: str = Field(..., description="Код культуры (например, wheat)")
    crop_name: str = Field(..., description="Название культуры (например, Пшеница)")
    volume_tons: float = Field(gt=0, description="Объем в тоннах")
    price_per_kg: float = Field(gt=0, description="Цена за кг в рублях")
    region: str = Field(..., description="Регион производства")
    delivery_days: int = Field(ge=0, description="Срок поставки в днях")
    quality: Optional[str] = Field("ГОСТ", description="Качество продукции")

class OfferCreate(OfferBase):
    pass

class Offer(OfferBase):
    id: int
    class Config:
        from_attributes = True

class DemandBase(BaseModel):
    user_name: str = Field(..., description="Имя инвестора")
    crop: str = Field(..., description="Код культуры")
    volume_tons: float = Field(gt=0, description="Требуемый объем")
    max_price_per_kg: float = Field(gt=0, description="Максимальная цена за кг")
    region: str = Field(..., description="Регион интереса")
    delivery_days: int = Field(ge=0, description="Желаемый срок поставки")
    deals_count: Optional[int] = Field(0, description="Количество успешных сделок")

class DemandCreate(DemandBase):
    pass

class Demand(DemandBase):
    id: int
    class Config:
        from_attributes = True
