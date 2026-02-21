"use client";

import {
	Baby,
	Banknote,
	Briefcase,
	Building,
	Car,
	Church,
	CircleDollarSign,
	Coffee,
	Coins,
	CreditCard,
	Dog,
	Dumbbell,
	Gamepad2,
	Gift,
	Globe,
	GraduationCap,
	HandCoins,
	Heart,
	Home,
	Landmark,
	Laptop,
	Music,
	Palmtree,
	PiggyBank,
	Plane,
	Receipt,
	Rocket,
	ShoppingBag,
	Smartphone,
	Sparkles,
	Star,
	Stethoscope,
	Sun,
	Utensils,
	Wallet,
	Wrench,
	type LucideIcon,
} from "lucide-react";

export const ACCOUNT_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
	wallet: { icon: Wallet, label: "Lommebok" },
	"credit-card": { icon: CreditCard, label: "Bankkort" },
	"piggy-bank": { icon: PiggyBank, label: "Sparegris" },
	landmark: { icon: Landmark, label: "Bank" },
	banknote: { icon: Banknote, label: "Seddel" },
	coins: { icon: Coins, label: "Mynter" },
	"hand-coins": { icon: HandCoins, label: "Betaling" },
	"circle-dollar": { icon: CircleDollarSign, label: "Dollar" },
	receipt: { icon: Receipt, label: "Kvittering" },
	briefcase: { icon: Briefcase, label: "Jobb" },
	building: { icon: Building, label: "Firma" },
	home: { icon: Home, label: "Bolig" },
	car: { icon: Car, label: "Bil" },
	plane: { icon: Plane, label: "Fly" },
	"palm-tree": { icon: Palmtree, label: "Ferie" },
	globe: { icon: Globe, label: "Reise" },
	"shopping-bag": { icon: ShoppingBag, label: "Shopping" },
	coffee: { icon: Coffee, label: "Kaffe" },
	utensils: { icon: Utensils, label: "Mat" },
	heart: { icon: Heart, label: "Helse" },
	stethoscope: { icon: Stethoscope, label: "Lege" },
	baby: { icon: Baby, label: "Barn" },
	dog: { icon: Dog, label: "Kjæledyr" },
	"graduation-cap": { icon: GraduationCap, label: "Utdanning" },
	dumbbell: { icon: Dumbbell, label: "Trening" },
	music: { icon: Music, label: "Musikk" },
	gamepad: { icon: Gamepad2, label: "Gaming" },
	laptop: { icon: Laptop, label: "Tech" },
	smartphone: { icon: Smartphone, label: "Mobil" },
	gift: { icon: Gift, label: "Gaver" },
	star: { icon: Star, label: "Favoritt" },
	sparkles: { icon: Sparkles, label: "Spesial" },
	sun: { icon: Sun, label: "Sol" },
	rocket: { icon: Rocket, label: "Investering" },
	wrench: { icon: Wrench, label: "Vedlikehold" },
	church: { icon: Church, label: "Donasjon" },
};

export function AccountIcon({
	icon,
	className = "h-4 w-4",
}: {
	icon: string;
	className?: string;
}) {
	const entry = ACCOUNT_ICONS[icon];
	if (!entry) {
		const Fallback = Wallet;
		return <Fallback className={className} />;
	}
	const Icon = entry.icon;
	return <Icon className={className} />;
}
