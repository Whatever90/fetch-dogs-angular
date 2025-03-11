import { Location } from "./location.model";
export interface Dog {
    id: string;
    img?: string;
    name?: string;
    age?: number;
    zip_code?: string;
    breed?: string;
    location?: Location
}