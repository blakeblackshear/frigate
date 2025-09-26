/** Used at the top-level node to indicate the context for the JSON-LD objects used. The context provided in this type is compatible with the keys and URLs in the rest of this generated file. */
export type WithContext<T extends Thing> = T & {
    "@context": "https://schema.org";
};
export interface Graph {
    "@context": "https://schema.org";
    "@graph": readonly Thing[];
}
type SchemaValue<T, TProperty extends string> = T | Role<T, TProperty> | readonly (T | Role<T, TProperty>)[];
type IdReference = {
    /** IRI identifying the canonical address of this object. */
    "@id": string;
};
/** Boolean: True or False. */
export type Boolean = "https://schema.org/False" | "False" | "https://schema.org/True" | "True" | boolean;
/** A date value in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 date format}. */
export type Date = string;
/** A combination of date and time of day in the form [-]CCYY-MM-DDThh:mm:ss[Z|(+|-)hh:mm] (see Chapter 5.4 of ISO 8601). */
export type DateTime = string;
interface EmployeeRoleBase extends OrganizationRoleBase {
    /** The base salary of the job or of an employee in an EmployeeRole. */
    "baseSalary"?: SchemaValue<MonetaryAmount | Number | PriceSpecification | IdReference, "baseSalary">;
    /** The currency (coded using {@link http://en.wikipedia.org/wiki/ISO_4217 ISO 4217}) used for the main salary information in this job posting or for this employee. */
    "salaryCurrency"?: SchemaValue<Text, "salaryCurrency">;
}
type EmployeeRoleLeaf<TContent, TProperty extends string> = EmployeeRoleBase & {
    "@type": "EmployeeRole";
} & {
    [key in TProperty]: TContent;
};
/** A subclass of OrganizationRole used to describe employee relationships. */
export type EmployeeRole<TContent = never, TProperty extends string = never> = EmployeeRoleLeaf<TContent, TProperty>;
interface LinkRoleBase extends RoleBase {
    /** The language of the content or performance or used in an action. Please use one of the language codes from the {@link http://tools.ietf.org/html/bcp47 IETF BCP 47 standard}. See also {@link https://schema.org/availableLanguage availableLanguage}. */
    "inLanguage"?: SchemaValue<Language | Text | IdReference, "inLanguage">;
    /** Indicates the relationship type of a Web link. */
    "linkRelationship"?: SchemaValue<Text, "linkRelationship">;
}
type LinkRoleLeaf<TContent, TProperty extends string> = LinkRoleBase & {
    "@type": "LinkRole";
} & {
    [key in TProperty]: TContent;
};
/** A Role that represents a Web link, e.g. as expressed via the 'url' property. Its linkRelationship property can indicate URL-based and plain textual link types, e.g. those in IANA link registry or others such as 'amphtml'. This structure provides a placeholder where details from HTML's link element can be represented outside of HTML, e.g. in JSON-LD feeds. */
export type LinkRole<TContent = never, TProperty extends string = never> = LinkRoleLeaf<TContent, TProperty>;
/**
 * Data type: Number.
 *
 * Usage guidelines:
 * - Use values from 0123456789 (Unicode 'DIGIT ZERO' (U+0030) to 'DIGIT NINE' (U+0039)) rather than superficially similar Unicode symbols.
 * - Use '.' (Unicode 'FULL STOP' (U+002E)) rather than ',' to indicate a decimal point. Avoid using these symbols as a readability separator.
 */
export type Number = Float | Integer | number | `${number}`;
interface OrganizationRoleBase extends RoleBase {
    /** A number associated with a role in an organization, for example, the number on an athlete's jersey. */
    "numberedPosition"?: SchemaValue<Number, "numberedPosition">;
}
type OrganizationRoleLeaf<TContent, TProperty extends string> = OrganizationRoleBase & {
    "@type": "OrganizationRole";
} & {
    [key in TProperty]: TContent;
};
/** A subclass of Role used to describe roles within organizations. */
export type OrganizationRole<TContent = never, TProperty extends string = never> = OrganizationRoleLeaf<TContent, TProperty> | EmployeeRole<TContent, TProperty>;
interface PerformanceRoleBase extends RoleBase {
    /** The name of a character played in some acting or performing role, i.e. in a PerformanceRole. */
    "characterName"?: SchemaValue<Text, "characterName">;
}
type PerformanceRoleLeaf<TContent, TProperty extends string> = PerformanceRoleBase & {
    "@type": "PerformanceRole";
} & {
    [key in TProperty]: TContent;
};
/** A PerformanceRole is a Role that some entity places with regard to a theatrical performance, e.g. in a Movie, TVSeries etc. */
export type PerformanceRole<TContent = never, TProperty extends string = never> = PerformanceRoleLeaf<TContent, TProperty>;
interface RoleBase extends ThingBase {
    /** The end date and time of the item (in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 date format}). */
    "endDate"?: SchemaValue<Date | DateTime, "endDate">;
    /**
     * A position played, performed or filled by a person or organization, as part of an organization. For example, an athlete in a SportsTeam might play in the position named 'Quarterback'.
     *
     * @deprecated Consider using https://schema.org/roleName instead.
     */
    "namedPosition"?: SchemaValue<Text | URL, "namedPosition">;
    /** A role played, performed or filled by a person or organization. For example, the team of creators for a comic book might fill the roles named 'inker', 'penciller', and 'letterer'; or an athlete in a SportsTeam might play in the position named 'Quarterback'. */
    "roleName"?: SchemaValue<Text | URL, "roleName">;
    /** The start date and time of the item (in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 date format}). */
    "startDate"?: SchemaValue<Date | DateTime, "startDate">;
}
type RoleLeaf<TContent, TProperty extends string> = RoleBase & {
    "@type": "Role";
} & {
    [key in TProperty]: TContent;
};
/**
 * Represents additional information about a relationship or property. For example a Role can be used to say that a 'member' role linking some SportsTeam to a player occurred during a particular time period. Or that a Person's 'actor' role in a Movie was for some particular characterName. Such properties can be attached to a Role entity, which is then associated with the main entities using ordinary properties like 'member' or 'actor'.
 *
 * See also {@link http://blog.schema.org/2014/06/introducing-role.html blog post}.
 */
export type Role<TContent = never, TProperty extends string = never> = RoleLeaf<TContent, TProperty> | LinkRole<TContent, TProperty> | OrganizationRole<TContent, TProperty> | PerformanceRole<TContent, TProperty>;
/** Data type: Text. */
export type Text = CssSelectorType | PronounceableText | URL | XPathType | string;
/** A point in time recurring on multiple days in the form hh:mm:ss[Z|(+|-)hh:mm] (see {@link http://www.w3.org/TR/xmlschema-2/#time XML schema for details}). */
export type Time = string;
/** The basic data types such as Integers, Strings, etc. */
export type DataType = Boolean | Date | DateTime | Number | Text | Time;
interface _3DModelBase extends MediaObjectBase {
    /** Whether the 3DModel allows resizing. For example, room layout applications often do not allow 3DModel elements to be resized to reflect reality. */
    "isResizable"?: SchemaValue<Boolean, "isResizable">;
}
interface _3DModelLeaf extends _3DModelBase {
    "@type": "3DModel";
}
/** A 3D model represents some kind of 3D content, which may have {@link https://schema.org/encoding encoding}s in one or more {@link https://schema.org/MediaObject MediaObject}s. Many 3D formats are available (e.g. see {@link https://en.wikipedia.org/wiki/Category:3D_graphics_file_formats Wikipedia}); specific encoding formats can be represented using the {@link https://schema.org/encodingFormat encodingFormat} property applied to the relevant {@link https://schema.org/MediaObject MediaObject}. For the case of a single file published after Zip compression, the convention of appending '+zip' to the {@link https://schema.org/encodingFormat encodingFormat} can be used. Geospatial, AR/VR, artistic/animation, gaming, engineering and scientific content can all be represented using {@link https://schema.org/3DModel 3DModel}. */
export type _3DModel = _3DModelLeaf;
interface AboutPageLeaf extends WebPageBase {
    "@type": "AboutPage";
}
/** Web page type: About page. */
export type AboutPage = AboutPageLeaf;
interface AcceptActionLeaf extends ActionBase {
    "@type": "AcceptAction";
}
/**
 * The act of committing to/adopting an object.
 *
 * Related actions:
 * - {@link https://schema.org/RejectAction RejectAction}: The antonym of AcceptAction.
 */
export type AcceptAction = AcceptActionLeaf;
interface AccommodationBase extends PlaceBase {
    /** Category of an {@link https://schema.org/Accommodation Accommodation}, following real estate conventions, e.g. RESO (see {@link https://ddwiki.reso.org/display/DDW17/PropertySubType+Field PropertySubType}, and {@link https://ddwiki.reso.org/display/DDW17/PropertyType+Field PropertyType} fields for suggested values). */
    "accommodationCategory"?: SchemaValue<Text, "accommodationCategory">;
    /** A floorplan of some {@link https://schema.org/Accommodation Accommodation}. */
    "accommodationFloorPlan"?: SchemaValue<FloorPlan | IdReference, "accommodationFloorPlan">;
    /** An amenity feature (e.g. a characteristic or service) of the Accommodation. This generic property does not make a statement about whether the feature is included in an offer for the main accommodation or available at extra costs. */
    "amenityFeature"?: SchemaValue<LocationFeatureSpecification | IdReference, "amenityFeature">;
    /** The type of bed or beds included in the accommodation. For the single case of just one bed of a certain type, you use bed directly with a text. If you want to indicate the quantity of a certain kind of bed, use an instance of BedDetails. For more detailed information, use the amenityFeature property. */
    "bed"?: SchemaValue<BedDetails | BedType | Text | IdReference, "bed">;
    /** The floor level for an {@link https://schema.org/Accommodation Accommodation} in a multi-storey building. Since counting systems {@link https://en.wikipedia.org/wiki/Storey#Consecutive_number_floor_designations vary internationally}, the local system should be used where possible. */
    "floorLevel"?: SchemaValue<Text, "floorLevel">;
    /** The size of the accommodation, e.g. in square meter or squarefoot. Typical unit code(s): MTK for square meter, FTK for square foot, or YDK for square yard. */
    "floorSize"?: SchemaValue<QuantitativeValue | IdReference, "floorSize">;
    /** Length of the lease for some {@link https://schema.org/Accommodation Accommodation}, either particular to some {@link https://schema.org/Offer Offer} or in some cases intrinsic to the property. */
    "leaseLength"?: SchemaValue<Duration | QuantitativeValue | IdReference, "leaseLength">;
    /** The total integer number of bathrooms in some {@link https://schema.org/Accommodation Accommodation}, following real estate conventions as {@link https://ddwiki.reso.org/display/DDW17/BathroomsTotalInteger+Field documented in RESO}: "The simple sum of the number of bathrooms. For example for a property with two Full Bathrooms and one Half Bathroom, the Bathrooms Total Integer will be 3.". See also {@link https://schema.org/numberOfRooms numberOfRooms}. */
    "numberOfBathroomsTotal"?: SchemaValue<Integer, "numberOfBathroomsTotal">;
    /** The total integer number of bedrooms in a some {@link https://schema.org/Accommodation Accommodation}, {@link https://schema.org/ApartmentComplex ApartmentComplex} or {@link https://schema.org/FloorPlan FloorPlan}. */
    "numberOfBedrooms"?: SchemaValue<Number | QuantitativeValue | IdReference, "numberOfBedrooms">;
    /** Number of full bathrooms - The total number of full and ¾ bathrooms in an {@link https://schema.org/Accommodation Accommodation}. This corresponds to the {@link https://ddwiki.reso.org/display/DDW17/BathroomsFull+Field BathroomsFull field in RESO}. */
    "numberOfFullBathrooms"?: SchemaValue<Number, "numberOfFullBathrooms">;
    /** Number of partial bathrooms - The total number of half and ¼ bathrooms in an {@link https://schema.org/Accommodation Accommodation}. This corresponds to the {@link https://ddwiki.reso.org/display/DDW17/BathroomsPartial+Field BathroomsPartial field in RESO}. */
    "numberOfPartialBathrooms"?: SchemaValue<Number, "numberOfPartialBathrooms">;
    /** The number of rooms (excluding bathrooms and closets) of the accommodation or lodging business. Typical unit code(s): ROM for room or C62 for no unit. The type of room can be put in the unitText property of the QuantitativeValue. */
    "numberOfRooms"?: SchemaValue<Number | QuantitativeValue | IdReference, "numberOfRooms">;
    /** The allowed total occupancy for the accommodation in persons (including infants etc). For individual accommodations, this is not necessarily the legal maximum but defines the permitted usage as per the contractual agreement (e.g. a double room used by a single person). Typical unit code(s): C62 for person. */
    "occupancy"?: SchemaValue<QuantitativeValue | IdReference, "occupancy">;
    /** Indications regarding the permitted usage of the accommodation. */
    "permittedUsage"?: SchemaValue<Text, "permittedUsage">;
    /** Indicates whether pets are allowed to enter the accommodation or lodging business. More detailed information can be put in a text value. */
    "petsAllowed"?: SchemaValue<Boolean | Text, "petsAllowed">;
    /** A page providing information on how to book a tour of some {@link https://schema.org/Place Place}, such as an {@link https://schema.org/Accommodation Accommodation} or {@link https://schema.org/ApartmentComplex ApartmentComplex} in a real estate setting, as well as other kinds of tours as appropriate. */
    "tourBookingPage"?: SchemaValue<URL, "tourBookingPage">;
    /** The year an {@link https://schema.org/Accommodation Accommodation} was constructed. This corresponds to the {@link https://ddwiki.reso.org/display/DDW17/YearBuilt+Field YearBuilt field in RESO}. */
    "yearBuilt"?: SchemaValue<Number, "yearBuilt">;
}
interface AccommodationLeaf extends AccommodationBase {
    "@type": "Accommodation";
}
/**
 * An accommodation is a place that can accommodate human beings, e.g. a hotel room, a camping pitch, or a meeting room. Many accommodations are for overnight stays, but this is not a mandatory requirement. For more specific types of accommodations not defined in schema.org, one can use [[additionalType]] with external vocabularies.
 *
 * See also the {@link /docs/hotels.html dedicated document on the use of schema.org for marking up hotels and other forms of accommodations}.
 */
export type Accommodation = AccommodationLeaf | Apartment | CampingPitch | House | Room | Suite | string;
interface AccountingServiceLeaf extends FinancialServiceBase {
    "@type": "AccountingService";
}
/**
 * Accountancy business.
 *
 * As a {@link https://schema.org/LocalBusiness LocalBusiness} it can be described as a {@link https://schema.org/provider provider} of one or more {@link https://schema.org/Service Service}(s).
 */
export type AccountingService = AccountingServiceLeaf | string;
interface AchieveActionLeaf extends ActionBase {
    "@type": "AchieveAction";
}
/** The act of accomplishing something via previous efforts. It is an instantaneous action rather than an ongoing process. */
export type AchieveAction = AchieveActionLeaf | LoseAction | TieAction | WinAction;
interface ActionBase extends ThingBase {
    /** Description of the process by which the action was performed. */
    "actionProcess"?: SchemaValue<HowTo | IdReference, "actionProcess">;
    /** Indicates the current disposition of the Action. */
    "actionStatus"?: SchemaValue<ActionStatusType | IdReference, "actionStatus">;
    /** The direct performer or driver of the action (animate or inanimate). E.g. _John_ wrote a book. */
    "agent"?: SchemaValue<Organization | Person | IdReference, "agent">;
    /**
     * The endTime of something. For a reserved event or service (e.g. FoodEstablishmentReservation), the time that it is expected to end. For actions that span a period of time, when the action was performed. E.g. John wrote a book from January to _December_. For media, including audio and video, it's the time offset of the end of a clip within a larger file.
     *
     * Note that Event uses startDate/endDate instead of startTime/endTime, even when describing dates with times. This situation may be clarified in future revisions.
     */
    "endTime"?: SchemaValue<DateTime | Time, "endTime">;
    /** For failed actions, more information on the cause of the failure. */
    "error"?: SchemaValue<Thing | IdReference, "error">;
    /** The object that helped the agent perform the action. E.g. John wrote a book with _a pen_. */
    "instrument"?: SchemaValue<Thing | IdReference, "instrument">;
    /** The location of, for example, where an event is happening, where an organization is located, or where an action takes place. */
    "location"?: SchemaValue<Place | PostalAddress | Text | VirtualLocation | IdReference, "location">;
    /** The object upon which the action is carried out, whose state is kept intact or changed. Also known as the semantic roles patient, affected or undergoer (which change their state) or theme (which doesn't). E.g. John read _a book_. */
    "object"?: SchemaValue<Thing | IdReference, "object">;
    /** Other co-agents that participated in the action indirectly. E.g. John wrote a book with _Steve_. */
    "participant"?: SchemaValue<Organization | Person | IdReference, "participant">;
    /** The service provider, service operator, or service performer; the goods producer. Another party (a seller) may offer those services or goods on behalf of the provider. A provider may also serve as the seller. */
    "provider"?: SchemaValue<Organization | Person | IdReference, "provider">;
    /** The result produced in the action. E.g. John wrote _a book_. */
    "result"?: SchemaValue<Thing | IdReference, "result">;
    /**
     * The startTime of something. For a reserved event or service (e.g. FoodEstablishmentReservation), the time that it is expected to start. For actions that span a period of time, when the action was performed. E.g. John wrote a book from _January_ to December. For media, including audio and video, it's the time offset of the start of a clip within a larger file.
     *
     * Note that Event uses startDate/endDate instead of startTime/endTime, even when describing dates with times. This situation may be clarified in future revisions.
     */
    "startTime"?: SchemaValue<DateTime | Time, "startTime">;
    /** Indicates a target EntryPoint, or url, for an Action. */
    "target"?: SchemaValue<EntryPoint | URL | IdReference, "target">;
}
interface ActionLeaf extends ActionBase {
    "@type": "Action";
}
/**
 * An action performed by a direct agent and indirect participants upon a direct object. Optionally happens at a location with the help of an inanimate instrument. The execution of the action may produce a result. Specific action sub-type documentation specifies the exact expectation of each argument/role.
 *
 * See also {@link http://blog.schema.org/2014/04/announcing-schemaorg-actions.html blog post} and {@link https://schema.org/docs/actions.html Actions overview document}.
 */
export type Action = ActionLeaf | AchieveAction | AssessAction | ConsumeAction | ControlAction | CreateAction | FindAction | InteractAction | MoveAction | OrganizeAction | PlayAction | SearchAction | SeekToAction | SolveMathAction | TradeAction | TransferAction | UpdateAction;
interface ActionAccessSpecificationBase extends ThingBase {
    /** The end of the availability of the product or service included in the offer. */
    "availabilityEnds"?: SchemaValue<Date | DateTime | Time, "availabilityEnds">;
    /** The beginning of the availability of the product or service included in the offer. */
    "availabilityStarts"?: SchemaValue<Date | DateTime | Time, "availabilityStarts">;
    /** A category for the item. Greater signs or slashes can be used to informally indicate a category hierarchy. */
    "category"?: SchemaValue<CategoryCode | PhysicalActivityCategory | Text | Thing | URL | IdReference, "category">;
    /**
     * The ISO 3166-1 (ISO 3166-1 alpha-2) or ISO 3166-2 code, the place, or the GeoShape for the geo-political region(s) for which the offer or delivery charge specification is valid.
     *
     * See also {@link https://schema.org/ineligibleRegion ineligibleRegion}.
     */
    "eligibleRegion"?: SchemaValue<GeoShape | Place | Text | IdReference, "eligibleRegion">;
    /** An Offer which must be accepted before the user can perform the Action. For example, the user may need to buy a movie before being able to watch it. */
    "expectsAcceptanceOf"?: SchemaValue<Offer | IdReference, "expectsAcceptanceOf">;
    /**
     * The ISO 3166-1 (ISO 3166-1 alpha-2) or ISO 3166-2 code, the place, or the GeoShape for the geo-political region(s) for which the offer or delivery charge specification is not valid, e.g. a region where the transaction is not allowed.
     *
     * See also {@link https://schema.org/eligibleRegion eligibleRegion}.
     */
    "ineligibleRegion"?: SchemaValue<GeoShape | Place | Text | IdReference, "ineligibleRegion">;
    /** Indicates if use of the media require a subscription (either paid or free). Allowed values are `true` or `false` (note that an earlier version had 'yes', 'no'). */
    "requiresSubscription"?: SchemaValue<Boolean | MediaSubscription | IdReference, "requiresSubscription">;
}
interface ActionAccessSpecificationLeaf extends ActionAccessSpecificationBase {
    "@type": "ActionAccessSpecification";
}
/** A set of requirements that must be fulfilled in order to perform an Action. */
export type ActionAccessSpecification = ActionAccessSpecificationLeaf;
interface ActionStatusTypeLeaf extends EnumerationBase {
    "@type": "ActionStatusType";
}
/** The status of an Action. */
export type ActionStatusType = "https://schema.org/ActiveActionStatus" | "ActiveActionStatus" | "https://schema.org/CompletedActionStatus" | "CompletedActionStatus" | "https://schema.org/FailedActionStatus" | "FailedActionStatus" | "https://schema.org/PotentialActionStatus" | "PotentialActionStatus" | ActionStatusTypeLeaf;
interface ActivateActionLeaf extends ActionBase {
    "@type": "ActivateAction";
}
/** The act of starting or activating a device or application (e.g. starting a timer or turning on a flashlight). */
export type ActivateAction = ActivateActionLeaf;
interface AddActionLeaf extends UpdateActionBase {
    "@type": "AddAction";
}
/** The act of editing by adding an object to a collection. */
export type AddAction = AddActionLeaf | InsertAction;
interface AdministrativeAreaLeaf extends PlaceBase {
    "@type": "AdministrativeArea";
}
/** A geographical region, typically under the jurisdiction of a particular government. */
export type AdministrativeArea = AdministrativeAreaLeaf | City | Country | SchoolDistrict | State | string;
interface AdultEntertainmentLeaf extends LocalBusinessBase {
    "@type": "AdultEntertainment";
}
/** An adult entertainment establishment. */
export type AdultEntertainment = AdultEntertainmentLeaf | string;
interface AdultOrientedEnumerationLeaf extends EnumerationBase {
    "@type": "AdultOrientedEnumeration";
}
/** Enumeration of considerations that make a product relevant or potentially restricted for adults only. */
export type AdultOrientedEnumeration = "https://schema.org/AlcoholConsideration" | "AlcoholConsideration" | "https://schema.org/DangerousGoodConsideration" | "DangerousGoodConsideration" | "https://schema.org/HealthcareConsideration" | "HealthcareConsideration" | "https://schema.org/NarcoticConsideration" | "NarcoticConsideration" | "https://schema.org/ReducedRelevanceForChildrenConsideration" | "ReducedRelevanceForChildrenConsideration" | "https://schema.org/SexualContentConsideration" | "SexualContentConsideration" | "https://schema.org/TobaccoNicotineConsideration" | "TobaccoNicotineConsideration" | "https://schema.org/UnclassifiedAdultConsideration" | "UnclassifiedAdultConsideration" | "https://schema.org/ViolenceConsideration" | "ViolenceConsideration" | "https://schema.org/WeaponConsideration" | "WeaponConsideration" | AdultOrientedEnumerationLeaf;
interface AdvertiserContentArticleLeaf extends ArticleBase {
    "@type": "AdvertiserContentArticle";
}
/** An {@link https://schema.org/Article Article} that an external entity has paid to place or to produce to its specifications. Includes {@link https://en.wikipedia.org/wiki/Advertorial advertorials}, sponsored content, native advertising and other paid content. */
export type AdvertiserContentArticle = AdvertiserContentArticleLeaf;
interface AggregateOfferBase extends OfferBase {
    /**
     * The highest price of all offers available.
     *
     * Usage guidelines:
     * - Use values from 0123456789 (Unicode 'DIGIT ZERO' (U+0030) to 'DIGIT NINE' (U+0039)) rather than superficially similar Unicode symbols.
     * - Use '.' (Unicode 'FULL STOP' (U+002E)) rather than ',' to indicate a decimal point. Avoid using these symbols as a readability separator.
     */
    "highPrice"?: SchemaValue<Number | Text, "highPrice">;
    /**
     * The lowest price of all offers available.
     *
     * Usage guidelines:
     * - Use values from 0123456789 (Unicode 'DIGIT ZERO' (U+0030) to 'DIGIT NINE' (U+0039)) rather than superficially similar Unicode symbols.
     * - Use '.' (Unicode 'FULL STOP' (U+002E)) rather than ',' to indicate a decimal point. Avoid using these symbols as a readability separator.
     */
    "lowPrice"?: SchemaValue<Number | Text, "lowPrice">;
    /** The number of offers for the product. */
    "offerCount"?: SchemaValue<Integer, "offerCount">;
    /** An offer to provide this item—for example, an offer to sell a product, rent the DVD of a movie, perform a service, or give away tickets to an event. Use {@link https://schema.org/businessFunction businessFunction} to indicate the kind of transaction offered, i.e. sell, lease, etc. This property can also be used to describe a {@link https://schema.org/Demand Demand}. While this property is listed as expected on a number of common types, it can be used in others. In that case, using a second type, such as Product or a subtype of Product, can clarify the nature of the offer. */
    "offers"?: SchemaValue<Demand | Offer | IdReference, "offers">;
}
interface AggregateOfferLeaf extends AggregateOfferBase {
    "@type": "AggregateOffer";
}
/**
 * When a single product is associated with multiple offers (for example, the same pair of shoes is offered by different merchants), then AggregateOffer can be used.
 *
 * Note: AggregateOffers are normally expected to associate multiple offers that all share the same defined {@link https://schema.org/businessFunction businessFunction} value, or default to http://purl.org/goodrelations/v1#Sell if businessFunction is not explicitly defined.
 */
export type AggregateOffer = AggregateOfferLeaf;
interface AggregateRatingBase extends RatingBase {
    /** The item that is being reviewed/rated. */
    "itemReviewed"?: SchemaValue<Thing | IdReference, "itemReviewed">;
    /** The count of total number of ratings. */
    "ratingCount"?: SchemaValue<Integer, "ratingCount">;
    /** The count of total number of reviews. */
    "reviewCount"?: SchemaValue<Integer, "reviewCount">;
}
interface AggregateRatingLeaf extends AggregateRatingBase {
    "@type": "AggregateRating";
}
/** The average rating based on multiple ratings or reviews. */
export type AggregateRating = AggregateRatingLeaf | EmployerAggregateRating;
interface AgreeActionLeaf extends ActionBase {
    "@type": "AgreeAction";
}
/** The act of expressing a consistency of opinion with the object. An agent agrees to/about an object (a proposition, topic or theme) with participants. */
export type AgreeAction = AgreeActionLeaf;
interface AirlineBase extends OrganizationBase {
    /** The type of boarding policy used by the airline (e.g. zone-based or group-based). */
    "boardingPolicy"?: SchemaValue<BoardingPolicyType | IdReference, "boardingPolicy">;
    /** IATA identifier for an airline or airport. */
    "iataCode"?: SchemaValue<Text, "iataCode">;
}
interface AirlineLeaf extends AirlineBase {
    "@type": "Airline";
}
/** An organization that provides flights for passengers. */
export type Airline = AirlineLeaf | string;
interface AirportBase extends CivicStructureBase {
    /** IATA identifier for an airline or airport. */
    "iataCode"?: SchemaValue<Text, "iataCode">;
    /** ICAO identifier for an airport. */
    "icaoCode"?: SchemaValue<Text, "icaoCode">;
}
interface AirportLeaf extends AirportBase {
    "@type": "Airport";
}
/** An airport. */
export type Airport = AirportLeaf | string;
interface AlignmentObjectBase extends ThingBase {
    /** A category of alignment between the learning resource and the framework node. Recommended values include: 'requires', 'textComplexity', 'readingLevel', and 'educationalSubject'. */
    "alignmentType"?: SchemaValue<Text, "alignmentType">;
    /** The framework to which the resource being described is aligned. */
    "educationalFramework"?: SchemaValue<Text, "educationalFramework">;
    /** The description of a node in an established educational framework. */
    "targetDescription"?: SchemaValue<Text, "targetDescription">;
    /** The name of a node in an established educational framework. */
    "targetName"?: SchemaValue<Text, "targetName">;
    /** The URL of a node in an established educational framework. */
    "targetUrl"?: SchemaValue<URL, "targetUrl">;
}
interface AlignmentObjectLeaf extends AlignmentObjectBase {
    "@type": "AlignmentObject";
}
/**
 * An intangible item that describes an alignment between a learning resource and a node in an educational framework.
 *
 * Should not be used where the nature of the alignment can be described using a simple property, for example to express that a resource {@link https://schema.org/teaches teaches} or {@link https://schema.org/assesses assesses} a competency.
 */
export type AlignmentObject = AlignmentObjectLeaf;
interface AllocateActionLeaf extends ActionBase {
    "@type": "AllocateAction";
}
/** The act of organizing tasks/objects/events by associating resources to it. */
export type AllocateAction = AllocateActionLeaf | AcceptAction | AssignAction | AuthorizeAction | RejectAction;
interface AmpStoryBase extends CreativeWorkBase, MediaObjectBase {
}
interface AmpStoryLeaf extends AmpStoryBase {
    "@type": "AmpStory";
}
/** A creative work with a visual storytelling format intended to be viewed online, particularly on mobile devices. */
export type AmpStory = AmpStoryLeaf;
interface AMRadioChannelLeaf extends BroadcastChannelBase {
    "@type": "AMRadioChannel";
}
/** A radio channel that uses AM. */
export type AMRadioChannel = AMRadioChannelLeaf;
interface AmusementParkLeaf extends LocalBusinessBase {
    "@type": "AmusementPark";
}
/** An amusement park. */
export type AmusementPark = AmusementParkLeaf | string;
interface AnalysisNewsArticleLeaf extends NewsArticleBase {
    "@type": "AnalysisNewsArticle";
}
/** An AnalysisNewsArticle is a {@link https://schema.org/NewsArticle NewsArticle} that, while based on factual reporting, incorporates the expertise of the author/producer, offering interpretations and conclusions. */
export type AnalysisNewsArticle = AnalysisNewsArticleLeaf;
interface AnatomicalStructureBase extends MedicalEntityBase {
    /** If applicable, a description of the pathophysiology associated with the anatomical system, including potential abnormal changes in the mechanical, physical, and biochemical functions of the system. */
    "associatedPathophysiology"?: SchemaValue<Text, "associatedPathophysiology">;
    /** Location in the body of the anatomical structure. */
    "bodyLocation"?: SchemaValue<Text, "bodyLocation">;
    /** Other anatomical structures to which this structure is connected. */
    "connectedTo"?: SchemaValue<AnatomicalStructure | IdReference, "connectedTo">;
    /** An image containing a diagram that illustrates the structure and/or its component substructures and/or connections with other structures. */
    "diagram"?: SchemaValue<ImageObject | IdReference, "diagram">;
    /** The anatomical or organ system that this structure is part of. */
    "partOfSystem"?: SchemaValue<AnatomicalSystem | IdReference, "partOfSystem">;
    /** A medical condition associated with this anatomy. */
    "relatedCondition"?: SchemaValue<MedicalCondition | IdReference, "relatedCondition">;
    /** A medical therapy related to this anatomy. */
    "relatedTherapy"?: SchemaValue<MedicalTherapy | IdReference, "relatedTherapy">;
    /** Component (sub-)structure(s) that comprise this anatomical structure. */
    "subStructure"?: SchemaValue<AnatomicalStructure | IdReference, "subStructure">;
}
interface AnatomicalStructureLeaf extends AnatomicalStructureBase {
    "@type": "AnatomicalStructure";
}
/** Any part of the human body, typically a component of an anatomical system. Organs, tissues, and cells are all anatomical structures. */
export type AnatomicalStructure = AnatomicalStructureLeaf | Bone | BrainStructure | Joint | Ligament | Muscle | Nerve | Vessel;
interface AnatomicalSystemBase extends MedicalEntityBase {
    /** If applicable, a description of the pathophysiology associated with the anatomical system, including potential abnormal changes in the mechanical, physical, and biochemical functions of the system. */
    "associatedPathophysiology"?: SchemaValue<Text, "associatedPathophysiology">;
    /** Specifying something physically contained by something else. Typically used here for the underlying anatomical structures, such as organs, that comprise the anatomical system. */
    "comprisedOf"?: SchemaValue<AnatomicalStructure | AnatomicalSystem | IdReference, "comprisedOf">;
    /** A medical condition associated with this anatomy. */
    "relatedCondition"?: SchemaValue<MedicalCondition | IdReference, "relatedCondition">;
    /** Related anatomical structure(s) that are not part of the system but relate or connect to it, such as vascular bundles associated with an organ system. */
    "relatedStructure"?: SchemaValue<AnatomicalStructure | IdReference, "relatedStructure">;
    /** A medical therapy related to this anatomy. */
    "relatedTherapy"?: SchemaValue<MedicalTherapy | IdReference, "relatedTherapy">;
}
interface AnatomicalSystemLeaf extends AnatomicalSystemBase {
    "@type": "AnatomicalSystem";
}
/** An anatomical system is a group of anatomical structures that work together to perform a certain task. Anatomical systems, such as organ systems, are one organizing principle of anatomy, and can include circulatory, digestive, endocrine, integumentary, immune, lymphatic, muscular, nervous, reproductive, respiratory, skeletal, urinary, vestibular, and other systems. */
export type AnatomicalSystem = AnatomicalSystemLeaf;
interface AnimalShelterLeaf extends LocalBusinessBase {
    "@type": "AnimalShelter";
}
/** Animal shelter. */
export type AnimalShelter = AnimalShelterLeaf | string;
interface AnswerBase extends CommentBase {
    /** A step-by-step or full explanation about Answer. Can outline how this Answer was achieved or contain more broad clarification or statement about it. */
    "answerExplanation"?: SchemaValue<Comment | WebContent | IdReference, "answerExplanation">;
    /** The parent of a question, answer or item in general. Typically used for Q/A discussion threads e.g. a chain of comments with the first comment being an {@link https://schema.org/Article Article} or other {@link https://schema.org/CreativeWork CreativeWork}. See also {@link https://schema.org/comment comment} which points from something to a comment about it. */
    "parentItem"?: SchemaValue<Comment | CreativeWork | IdReference, "parentItem">;
}
interface AnswerLeaf extends AnswerBase {
    "@type": "Answer";
}
/** An answer offered to a question; perhaps correct, perhaps opinionated or wrong. */
export type Answer = AnswerLeaf;
interface ApartmentBase extends AccommodationBase {
    /** The number of rooms (excluding bathrooms and closets) of the accommodation or lodging business. Typical unit code(s): ROM for room or C62 for no unit. The type of room can be put in the unitText property of the QuantitativeValue. */
    "numberOfRooms"?: SchemaValue<Number | QuantitativeValue | IdReference, "numberOfRooms">;
    /** The allowed total occupancy for the accommodation in persons (including infants etc). For individual accommodations, this is not necessarily the legal maximum but defines the permitted usage as per the contractual agreement (e.g. a double room used by a single person). Typical unit code(s): C62 for person. */
    "occupancy"?: SchemaValue<QuantitativeValue | IdReference, "occupancy">;
}
interface ApartmentLeaf extends ApartmentBase {
    "@type": "Apartment";
}
/** An apartment (in American English) or flat (in British English) is a self-contained housing unit (a type of residential real estate) that occupies only part of a building (source: Wikipedia, the free encyclopedia, see {@link http://en.wikipedia.org/wiki/Apartment http://en.wikipedia.org/wiki/Apartment}). */
export type Apartment = ApartmentLeaf | string;
interface ApartmentComplexBase extends ResidenceBase {
    /** Indicates the total (available plus unavailable) number of accommodation units in an {@link https://schema.org/ApartmentComplex ApartmentComplex}, or the number of accommodation units for a specific {@link https://schema.org/FloorPlan FloorPlan} (within its specific {@link https://schema.org/ApartmentComplex ApartmentComplex}). See also {@link https://schema.org/numberOfAvailableAccommodationUnits numberOfAvailableAccommodationUnits}. */
    "numberOfAccommodationUnits"?: SchemaValue<QuantitativeValue | IdReference, "numberOfAccommodationUnits">;
    /** Indicates the number of available accommodation units in an {@link https://schema.org/ApartmentComplex ApartmentComplex}, or the number of accommodation units for a specific {@link https://schema.org/FloorPlan FloorPlan} (within its specific {@link https://schema.org/ApartmentComplex ApartmentComplex}). See also {@link https://schema.org/numberOfAccommodationUnits numberOfAccommodationUnits}. */
    "numberOfAvailableAccommodationUnits"?: SchemaValue<QuantitativeValue | IdReference, "numberOfAvailableAccommodationUnits">;
    /** The total integer number of bedrooms in a some {@link https://schema.org/Accommodation Accommodation}, {@link https://schema.org/ApartmentComplex ApartmentComplex} or {@link https://schema.org/FloorPlan FloorPlan}. */
    "numberOfBedrooms"?: SchemaValue<Number | QuantitativeValue | IdReference, "numberOfBedrooms">;
    /** Indicates whether pets are allowed to enter the accommodation or lodging business. More detailed information can be put in a text value. */
    "petsAllowed"?: SchemaValue<Boolean | Text, "petsAllowed">;
    /** A page providing information on how to book a tour of some {@link https://schema.org/Place Place}, such as an {@link https://schema.org/Accommodation Accommodation} or {@link https://schema.org/ApartmentComplex ApartmentComplex} in a real estate setting, as well as other kinds of tours as appropriate. */
    "tourBookingPage"?: SchemaValue<URL, "tourBookingPage">;
}
interface ApartmentComplexLeaf extends ApartmentComplexBase {
    "@type": "ApartmentComplex";
}
/** Residence type: Apartment complex. */
export type ApartmentComplex = ApartmentComplexLeaf | string;
interface APIReferenceBase extends TechArticleBase {
    /**
     * Library file name, e.g., mscorlib.dll, system.web.dll.
     *
     * @deprecated Consider using https://schema.org/executableLibraryName instead.
     */
    "assembly"?: SchemaValue<Text, "assembly">;
    /** Associated product/technology version. E.g., .NET Framework 4.5. */
    "assemblyVersion"?: SchemaValue<Text, "assemblyVersion">;
    /** Library file name, e.g., mscorlib.dll, system.web.dll. */
    "executableLibraryName"?: SchemaValue<Text, "executableLibraryName">;
    /** Indicates whether API is managed or unmanaged. */
    "programmingModel"?: SchemaValue<Text, "programmingModel">;
    /** Type of app development: phone, Metro style, desktop, XBox, etc. */
    "targetPlatform"?: SchemaValue<Text, "targetPlatform">;
}
interface APIReferenceLeaf extends APIReferenceBase {
    "@type": "APIReference";
}
/** Reference documentation for application programming interfaces (APIs). */
export type APIReference = APIReferenceLeaf;
interface AppendActionLeaf extends InsertActionBase {
    "@type": "AppendAction";
}
/** The act of inserting at the end if an ordered collection. */
export type AppendAction = AppendActionLeaf;
interface ApplyActionLeaf extends ActionBase {
    "@type": "ApplyAction";
}
/**
 * The act of registering to an organization/service without the guarantee to receive it.
 *
 * Related actions:
 * - {@link https://schema.org/RegisterAction RegisterAction}: Unlike RegisterAction, ApplyAction has no guarantees that the application will be accepted.
 */
export type ApplyAction = ApplyActionLeaf;
interface ApprovedIndicationLeaf extends MedicalEntityBase {
    "@type": "ApprovedIndication";
}
/** An indication for a medical therapy that has been formally specified or approved by a regulatory body that regulates use of the therapy; for example, the US FDA approves indications for most drugs in the US. */
export type ApprovedIndication = ApprovedIndicationLeaf;
interface AquariumLeaf extends CivicStructureBase {
    "@type": "Aquarium";
}
/** Aquarium. */
export type Aquarium = AquariumLeaf | string;
interface ArchiveComponentBase extends CreativeWorkBase {
    /** {@link https://schema.org/ArchiveOrganization ArchiveOrganization} that holds, keeps or maintains the {@link https://schema.org/ArchiveComponent ArchiveComponent}. */
    "holdingArchive"?: SchemaValue<ArchiveOrganization | IdReference, "holdingArchive">;
    /** Current location of the item. */
    "itemLocation"?: SchemaValue<Place | PostalAddress | Text | IdReference, "itemLocation">;
}
interface ArchiveComponentLeaf extends ArchiveComponentBase {
    "@type": "ArchiveComponent";
}
/** An intangible type to be applied to any archive content, carrying with it a set of properties required to describe archival items and collections. */
export type ArchiveComponent = ArchiveComponentLeaf;
interface ArchiveOrganizationBase extends LocalBusinessBase {
    /** Collection, {@link https://en.wikipedia.org/wiki/Fonds fonds}, or item held, kept or maintained by an {@link https://schema.org/ArchiveOrganization ArchiveOrganization}. */
    "archiveHeld"?: SchemaValue<ArchiveComponent | IdReference, "archiveHeld">;
}
interface ArchiveOrganizationLeaf extends ArchiveOrganizationBase {
    "@type": "ArchiveOrganization";
}
/** An organization with archival holdings. An organization which keeps and preserves archival material and typically makes it accessible to the public. */
export type ArchiveOrganization = ArchiveOrganizationLeaf | string;
interface ArriveActionLeaf extends MoveActionBase {
    "@type": "ArriveAction";
}
/** The act of arriving at a place. An agent arrives at a destination from a fromLocation, optionally with participants. */
export type ArriveAction = ArriveActionLeaf;
interface ArteryBase extends AnatomicalStructureBase {
    /** The branches that comprise the arterial structure. */
    "arterialBranch"?: SchemaValue<AnatomicalStructure | IdReference, "arterialBranch">;
    /** The area to which the artery supplies blood. */
    "supplyTo"?: SchemaValue<AnatomicalStructure | IdReference, "supplyTo">;
}
interface ArteryLeaf extends ArteryBase {
    "@type": "Artery";
}
/** A type of blood vessel that specifically carries blood away from the heart. */
export type Artery = ArteryLeaf;
interface ArtGalleryLeaf extends LocalBusinessBase {
    "@type": "ArtGallery";
}
/** An art gallery. */
export type ArtGallery = ArtGalleryLeaf | string;
interface ArticleBase extends CreativeWorkBase {
    /** The actual body of the article. */
    "articleBody"?: SchemaValue<Text, "articleBody">;
    /** Articles may belong to one or more 'sections' in a magazine or newspaper, such as Sports, Lifestyle, etc. */
    "articleSection"?: SchemaValue<Text, "articleSection">;
    /** For an {@link https://schema.org/Article Article}, typically a {@link https://schema.org/NewsArticle NewsArticle}, the backstory property provides a textual summary giving a brief explanation of why and how an article was created. In a journalistic setting this could include information about reporting process, methods, interviews, data sources, etc. */
    "backstory"?: SchemaValue<CreativeWork | Text | IdReference, "backstory">;
    /** The page on which the work ends; for example "138" or "xvi". */
    "pageEnd"?: SchemaValue<Integer | Text, "pageEnd">;
    /** The page on which the work starts; for example "135" or "xiii". */
    "pageStart"?: SchemaValue<Integer | Text, "pageStart">;
    /** Any description of pages that is not separated into pageStart and pageEnd; for example, "1-6, 9, 55" or "10-12, 46-49". */
    "pagination"?: SchemaValue<Text, "pagination">;
    /**
     * Indicates sections of a Web page that are particularly 'speakable' in the sense of being highlighted as being especially appropriate for text-to-speech conversion. Other sections of a page may also be usefully spoken in particular circumstances; the 'speakable' property serves to indicate the parts most likely to be generally useful for speech.
     *
     * The _speakable_ property can be repeated an arbitrary number of times, with three kinds of possible 'content-locator' values:
     *
     * 1.) _id-value_ URL references - uses _id-value_ of an element in the page being annotated. The simplest use of _speakable_ has (potentially relative) URL values, referencing identified sections of the document concerned.
     *
     * 2.) CSS Selectors - addresses content in the annotated page, e.g. via class attribute. Use the {@link https://schema.org/cssSelector cssSelector} property.
     *
     * 3.) XPaths - addresses content via XPaths (assuming an XML view of the content). Use the {@link https://schema.org/xpath xpath} property.
     *
     * For more sophisticated markup of speakable sections beyond simple ID references, either CSS selectors or XPath expressions to pick out document section(s) as speakable. For this we define a supporting type, {@link https://schema.org/SpeakableSpecification SpeakableSpecification} which is defined to be a possible value of the _speakable_ property.
     */
    "speakable"?: SchemaValue<SpeakableSpecification | URL | IdReference, "speakable">;
    /** The number of words in the text of the Article. */
    "wordCount"?: SchemaValue<Integer, "wordCount">;
}
interface ArticleLeaf extends ArticleBase {
    "@type": "Article";
}
/**
 * An article, such as a news article or piece of investigative report. Newspapers and magazines have articles of many different types and this is intended to cover them all.
 *
 * See also {@link http://blog.schema.org/2014/09/schemaorg-support-for-bibliographic_2.html blog post}.
 */
export type Article = ArticleLeaf | AdvertiserContentArticle | NewsArticle | Report | SatiricalArticle | ScholarlyArticle | SocialMediaPosting | TechArticle;
interface AskActionBase extends CommunicateActionBase {
    /** A sub property of object. A question. */
    "question"?: SchemaValue<Question | IdReference, "question">;
}
interface AskActionLeaf extends AskActionBase {
    "@type": "AskAction";
}
/**
 * The act of posing a question / favor to someone.
 *
 * Related actions:
 * - {@link https://schema.org/ReplyAction ReplyAction}: Appears generally as a response to AskAction.
 */
export type AskAction = AskActionLeaf;
interface AskPublicNewsArticleLeaf extends NewsArticleBase {
    "@type": "AskPublicNewsArticle";
}
/** A {@link https://schema.org/NewsArticle NewsArticle} expressing an open call by a {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization} asking the public for input, insights, clarifications, anecdotes, documentation, etc., on an issue, for reporting purposes. */
export type AskPublicNewsArticle = AskPublicNewsArticleLeaf;
interface AssessActionLeaf extends ActionBase {
    "@type": "AssessAction";
}
/** The act of forming one's opinion, reaction or sentiment. */
export type AssessAction = AssessActionLeaf | ChooseAction | IgnoreAction | ReactAction | ReviewAction;
interface AssignActionLeaf extends ActionBase {
    "@type": "AssignAction";
}
/** The act of allocating an action/event/task to some destination (someone or something). */
export type AssignAction = AssignActionLeaf;
interface AtlasLeaf extends CreativeWorkBase {
    "@type": "Atlas";
}
/** A collection or bound volume of maps, charts, plates or tables, physical or in media form illustrating any subject. */
export type Atlas = AtlasLeaf;
interface AttorneyLeaf extends LocalBusinessBase {
    "@type": "Attorney";
}
/**
 * Professional service: Attorney.
 *
 * This type is deprecated - {@link https://schema.org/LegalService LegalService} is more inclusive and less ambiguous.
 */
export type Attorney = AttorneyLeaf | string;
interface AudienceBase extends ThingBase {
    /** The target group associated with a given audience (e.g. veterans, car owners, musicians, etc.). */
    "audienceType"?: SchemaValue<Text, "audienceType">;
    /** The geographic area associated with the audience. */
    "geographicArea"?: SchemaValue<AdministrativeArea | IdReference, "geographicArea">;
}
interface AudienceLeaf extends AudienceBase {
    "@type": "Audience";
}
/** Intended audience for an item, i.e. the group for whom the item was created. */
export type Audience = AudienceLeaf | BusinessAudience | EducationalAudience | MedicalAudience | PeopleAudience | Researcher;
interface AudiobookBase extends BookBase, AudioObjectBase {
    /** The duration of the item (movie, audio recording, event, etc.) in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 duration format}. */
    "duration"?: SchemaValue<Duration | IdReference, "duration">;
    /** A person who reads (performs) the audiobook. */
    "readBy"?: SchemaValue<Person | IdReference, "readBy">;
}
interface AudiobookLeaf extends AudiobookBase {
    "@type": "Audiobook";
}
/** An audiobook. */
export type Audiobook = AudiobookLeaf;
interface AudioObjectBase extends MediaObjectBase {
    /** The caption for this object. For downloadable machine formats (closed caption, subtitles etc.) use MediaObject and indicate the {@link https://schema.org/encodingFormat encodingFormat}. */
    "caption"?: SchemaValue<MediaObject | Text | IdReference, "caption">;
    /** Represents textual captioning from a {@link https://schema.org/MediaObject MediaObject}, e.g. text of a 'meme'. */
    "embeddedTextCaption"?: SchemaValue<Text, "embeddedTextCaption">;
    /** If this MediaObject is an AudioObject or VideoObject, the transcript of that object. */
    "transcript"?: SchemaValue<Text, "transcript">;
}
interface AudioObjectLeaf extends AudioObjectBase {
    "@type": "AudioObject";
}
/** An audio file. */
export type AudioObject = AudioObjectLeaf | Audiobook | AudioObjectSnapshot;
interface AudioObjectSnapshotLeaf extends AudioObjectBase {
    "@type": "AudioObjectSnapshot";
}
/** A specific and exact (byte-for-byte) version of an {@link https://schema.org/AudioObject AudioObject}. Two byte-for-byte identical files, for the purposes of this type, considered identical. If they have different embedded metadata the files will differ. Different external facts about the files, e.g. creator or dateCreated that aren't represented in their actual content, do not affect this notion of identity. */
export type AudioObjectSnapshot = AudioObjectSnapshotLeaf;
interface AuthorizeActionBase extends ActionBase {
    /** A sub property of participant. The participant who is at the receiving end of the action. */
    "recipient"?: SchemaValue<Audience | ContactPoint | Organization | Person | IdReference, "recipient">;
}
interface AuthorizeActionLeaf extends AuthorizeActionBase {
    "@type": "AuthorizeAction";
}
/** The act of granting permission to an object. */
export type AuthorizeAction = AuthorizeActionLeaf;
interface AutoBodyShopLeaf extends LocalBusinessBase {
    "@type": "AutoBodyShop";
}
/** Auto body shop. */
export type AutoBodyShop = AutoBodyShopLeaf | string;
interface AutoDealerLeaf extends LocalBusinessBase {
    "@type": "AutoDealer";
}
/** An car dealership. */
export type AutoDealer = AutoDealerLeaf | string;
interface AutomatedTellerLeaf extends FinancialServiceBase {
    "@type": "AutomatedTeller";
}
/** ATM/cash machine. */
export type AutomatedTeller = AutomatedTellerLeaf | string;
interface AutomotiveBusinessLeaf extends LocalBusinessBase {
    "@type": "AutomotiveBusiness";
}
/** Car repair, sales, or parts. */
export type AutomotiveBusiness = AutomotiveBusinessLeaf | AutoBodyShop | AutoDealer | AutoPartsStore | AutoRental | AutoRepair | AutoWash | GasStation | MotorcycleDealer | MotorcycleRepair | string;
interface AutoPartsStoreBase extends LocalBusinessBase, LocalBusinessBase {
}
interface AutoPartsStoreLeaf extends AutoPartsStoreBase {
    "@type": "AutoPartsStore";
}
/** An auto parts store. */
export type AutoPartsStore = AutoPartsStoreLeaf | string;
interface AutoRentalLeaf extends LocalBusinessBase {
    "@type": "AutoRental";
}
/** A car rental business. */
export type AutoRental = AutoRentalLeaf | string;
interface AutoRepairLeaf extends LocalBusinessBase {
    "@type": "AutoRepair";
}
/** Car repair business. */
export type AutoRepair = AutoRepairLeaf | string;
interface AutoWashLeaf extends LocalBusinessBase {
    "@type": "AutoWash";
}
/** A car wash business. */
export type AutoWash = AutoWashLeaf | string;
interface BackgroundNewsArticleLeaf extends NewsArticleBase {
    "@type": "BackgroundNewsArticle";
}
/** A {@link https://schema.org/NewsArticle NewsArticle} providing historical context, definition and detail on a specific topic (aka "explainer" or "backgrounder"). For example, an in-depth article or frequently-asked-questions ({@link https://en.wikipedia.org/wiki/FAQ FAQ}) document on topics such as Climate Change or the European Union. Other kinds of background material from a non-news setting are often described using {@link https://schema.org/Book Book} or {@link https://schema.org/Article Article}, in particular {@link https://schema.org/ScholarlyArticle ScholarlyArticle}. See also {@link https://schema.org/NewsArticle NewsArticle} for related vocabulary from a learning/education perspective. */
export type BackgroundNewsArticle = BackgroundNewsArticleLeaf;
interface BakeryLeaf extends FoodEstablishmentBase {
    "@type": "Bakery";
}
/** A bakery. */
export type Bakery = BakeryLeaf | string;
interface BankAccountBase extends FinancialProductBase {
    /** A minimum amount that has to be paid in every month. */
    "accountMinimumInflow"?: SchemaValue<MonetaryAmount | IdReference, "accountMinimumInflow">;
    /** An overdraft is an extension of credit from a lending institution when an account reaches zero. An overdraft allows the individual to continue withdrawing money even if the account has no funds in it. Basically the bank allows people to borrow a set amount of money. */
    "accountOverdraftLimit"?: SchemaValue<MonetaryAmount | IdReference, "accountOverdraftLimit">;
    /** The type of a bank account. */
    "bankAccountType"?: SchemaValue<Text | URL, "bankAccountType">;
}
interface BankAccountLeaf extends BankAccountBase {
    "@type": "BankAccount";
}
/** A product or service offered by a bank whereby one may deposit, withdraw or transfer money and in some cases be paid interest. */
export type BankAccount = BankAccountLeaf | DepositAccount;
interface BankOrCreditUnionLeaf extends FinancialServiceBase {
    "@type": "BankOrCreditUnion";
}
/** Bank or credit union. */
export type BankOrCreditUnion = BankOrCreditUnionLeaf | string;
interface BarcodeLeaf extends ImageObjectBase {
    "@type": "Barcode";
}
/** An image of a visual machine-readable code such as a barcode or QR code. */
export type Barcode = BarcodeLeaf;
interface BarOrPubLeaf extends FoodEstablishmentBase {
    "@type": "BarOrPub";
}
/** A bar or pub. */
export type BarOrPub = BarOrPubLeaf | string;
interface BeachLeaf extends CivicStructureBase {
    "@type": "Beach";
}
/** Beach. */
export type Beach = BeachLeaf | string;
interface BeautySalonLeaf extends LocalBusinessBase {
    "@type": "BeautySalon";
}
/** Beauty salon. */
export type BeautySalon = BeautySalonLeaf | string;
interface BedAndBreakfastLeaf extends LodgingBusinessBase {
    "@type": "BedAndBreakfast";
}
/**
 * Bed and breakfast.
 *
 * See also the {@link /docs/hotels.html dedicated document on the use of schema.org for marking up hotels and other forms of accommodations}.
 */
export type BedAndBreakfast = BedAndBreakfastLeaf | string;
interface BedDetailsBase extends ThingBase {
    /** The quantity of the given bed type available in the HotelRoom, Suite, House, or Apartment. */
    "numberOfBeds"?: SchemaValue<Number, "numberOfBeds">;
    /** The type of bed to which the BedDetail refers, i.e. the type of bed available in the quantity indicated by quantity. */
    "typeOfBed"?: SchemaValue<BedType | Text | IdReference, "typeOfBed">;
}
interface BedDetailsLeaf extends BedDetailsBase {
    "@type": "BedDetails";
}
/** An entity holding detailed information about the available bed types, e.g. the quantity of twin beds for a hotel room. For the single case of just one bed of a certain type, you can use bed directly with a text. See also {@link https://schema.org/BedType BedType} (under development). */
export type BedDetails = BedDetailsLeaf;
interface BedTypeLeaf extends QualitativeValueBase {
    "@type": "BedType";
}
/** A type of bed. This is used for indicating the bed or beds available in an accommodation. */
export type BedType = BedTypeLeaf;
interface BefriendActionLeaf extends ActionBase {
    "@type": "BefriendAction";
}
/**
 * The act of forming a personal connection with someone (object) mutually/bidirectionally/symmetrically.
 *
 * Related actions:
 * - {@link https://schema.org/FollowAction FollowAction}: Unlike FollowAction, BefriendAction implies that the connection is reciprocal.
 */
export type BefriendAction = BefriendActionLeaf;
interface BikeStoreLeaf extends LocalBusinessBase {
    "@type": "BikeStore";
}
/** A bike store. */
export type BikeStore = BikeStoreLeaf | string;
interface BioChemEntityBase extends ThingBase {
    /** Disease associated to this BioChemEntity. Such disease can be a MedicalCondition or a URL. If you want to add an evidence supporting the association, please use PropertyValue. */
    "associatedDisease"?: SchemaValue<MedicalCondition | PropertyValue | URL | IdReference, "associatedDisease">;
    /** A BioChemEntity that is known to interact with this item. */
    "bioChemInteraction"?: SchemaValue<BioChemEntity | IdReference, "bioChemInteraction">;
    /** A similar BioChemEntity, e.g., obtained by fingerprint similarity algorithms. */
    "bioChemSimilarity"?: SchemaValue<BioChemEntity | IdReference, "bioChemSimilarity">;
    /** A role played by the BioChemEntity within a biological context. */
    "biologicalRole"?: SchemaValue<DefinedTerm | IdReference, "biologicalRole">;
    /** A {@link https://schema.org/Grant Grant} that directly or indirectly provide funding or sponsorship for this item. See also {@link https://schema.org/ownershipFundingInfo ownershipFundingInfo}. */
    "funding"?: SchemaValue<Grant | IdReference, "funding">;
    /** Indicates a BioChemEntity that (in some sense) has this BioChemEntity as a part. */
    "hasBioChemEntityPart"?: SchemaValue<BioChemEntity | IdReference, "hasBioChemEntityPart">;
    /** Molecular function performed by this BioChemEntity; please use PropertyValue if you want to include any evidence. */
    "hasMolecularFunction"?: SchemaValue<DefinedTerm | PropertyValue | URL | IdReference, "hasMolecularFunction">;
    /** A common representation such as a protein sequence or chemical structure for this entity. For images use schema.org/image. */
    "hasRepresentation"?: SchemaValue<PropertyValue | Text | URL | IdReference, "hasRepresentation">;
    /** Another BioChemEntity encoding by this one. */
    "isEncodedByBioChemEntity"?: SchemaValue<Gene | IdReference, "isEncodedByBioChemEntity">;
    /** Biological process this BioChemEntity is involved in; please use PropertyValue if you want to include any evidence. */
    "isInvolvedInBiologicalProcess"?: SchemaValue<DefinedTerm | PropertyValue | URL | IdReference, "isInvolvedInBiologicalProcess">;
    /** Subcellular location where this BioChemEntity is located; please use PropertyValue if you want to include any evidence. */
    "isLocatedInSubcellularLocation"?: SchemaValue<DefinedTerm | PropertyValue | URL | IdReference, "isLocatedInSubcellularLocation">;
    /** Indicates a BioChemEntity that is (in some sense) a part of this BioChemEntity. */
    "isPartOfBioChemEntity"?: SchemaValue<BioChemEntity | IdReference, "isPartOfBioChemEntity">;
    /** The taxonomic grouping of the organism that expresses, encodes, or in some way related to the BioChemEntity. */
    "taxonomicRange"?: SchemaValue<DefinedTerm | Taxon | Text | URL | IdReference, "taxonomicRange">;
}
interface BioChemEntityLeaf extends BioChemEntityBase {
    "@type": "BioChemEntity";
}
/** Any biological, chemical, or biochemical thing. For example: a protein; a gene; a chemical; a synthetic chemical. */
export type BioChemEntity = BioChemEntityLeaf | ChemicalSubstance | Gene | MolecularEntity | Protein;
interface BlogBase extends CreativeWorkBase {
    /** A posting that is part of this blog. */
    "blogPost"?: SchemaValue<BlogPosting | IdReference, "blogPost">;
    /**
     * Indicates a post that is part of a {@link https://schema.org/Blog Blog}. Note that historically, what we term a "Blog" was once known as a "weblog", and that what we term a "BlogPosting" is now often colloquially referred to as a "blog".
     *
     * @deprecated Consider using https://schema.org/blogPost instead.
     */
    "blogPosts"?: SchemaValue<BlogPosting | IdReference, "blogPosts">;
    /** The International Standard Serial Number (ISSN) that identifies this serial publication. You can repeat this property to identify different formats of, or the linking ISSN (ISSN-L) for, this serial publication. */
    "issn"?: SchemaValue<Text, "issn">;
}
interface BlogLeaf extends BlogBase {
    "@type": "Blog";
}
/** A {@link https://en.wikipedia.org/wiki/Blog blog}, sometimes known as a "weblog". Note that the individual posts ({@link https://schema.org/BlogPosting BlogPosting}s) in a {@link https://schema.org/Blog Blog} are often colloquially referred to by the same term. */
export type Blog = BlogLeaf;
interface BlogPostingLeaf extends SocialMediaPostingBase {
    "@type": "BlogPosting";
}
/** A blog post. */
export type BlogPosting = BlogPostingLeaf | LiveBlogPosting;
interface BloodTestLeaf extends MedicalTestBase {
    "@type": "BloodTest";
}
/** A medical test performed on a sample of a patient's blood. */
export type BloodTest = BloodTestLeaf;
interface BoardingPolicyTypeLeaf extends EnumerationBase {
    "@type": "BoardingPolicyType";
}
/** A type of boarding policy used by an airline. */
export type BoardingPolicyType = "https://schema.org/GroupBoardingPolicy" | "GroupBoardingPolicy" | "https://schema.org/ZoneBoardingPolicy" | "ZoneBoardingPolicy" | BoardingPolicyTypeLeaf;
interface BoatReservationLeaf extends ReservationBase {
    "@type": "BoatReservation";
}
/**
 * A reservation for boat travel.
 *
 * Note: This type is for information about actual reservations, e.g. in confirmation emails or HTML pages with individual confirmations of reservations. For offers of tickets, use {@link https://schema.org/Offer Offer}.
 */
export type BoatReservation = BoatReservationLeaf;
interface BoatTerminalLeaf extends CivicStructureBase {
    "@type": "BoatTerminal";
}
/** A terminal for boats, ships, and other water vessels. */
export type BoatTerminal = BoatTerminalLeaf | string;
interface BoatTripBase extends TripBase {
    /** The terminal or port from which the boat arrives. */
    "arrivalBoatTerminal"?: SchemaValue<BoatTerminal | IdReference, "arrivalBoatTerminal">;
    /** The terminal or port from which the boat departs. */
    "departureBoatTerminal"?: SchemaValue<BoatTerminal | IdReference, "departureBoatTerminal">;
}
interface BoatTripLeaf extends BoatTripBase {
    "@type": "BoatTrip";
}
/** A trip on a commercial ferry line. */
export type BoatTrip = BoatTripLeaf;
interface BodyMeasurementTypeEnumerationLeaf extends EnumerationBase {
    "@type": "BodyMeasurementTypeEnumeration";
}
/** Enumerates types (or dimensions) of a person's body measurements, for example for fitting of clothes. */
export type BodyMeasurementTypeEnumeration = "https://schema.org/BodyMeasurementArm" | "BodyMeasurementArm" | "https://schema.org/BodyMeasurementBust" | "BodyMeasurementBust" | "https://schema.org/BodyMeasurementChest" | "BodyMeasurementChest" | "https://schema.org/BodyMeasurementFoot" | "BodyMeasurementFoot" | "https://schema.org/BodyMeasurementHand" | "BodyMeasurementHand" | "https://schema.org/BodyMeasurementHead" | "BodyMeasurementHead" | "https://schema.org/BodyMeasurementHeight" | "BodyMeasurementHeight" | "https://schema.org/BodyMeasurementHips" | "BodyMeasurementHips" | "https://schema.org/BodyMeasurementInsideLeg" | "BodyMeasurementInsideLeg" | "https://schema.org/BodyMeasurementNeck" | "BodyMeasurementNeck" | "https://schema.org/BodyMeasurementUnderbust" | "BodyMeasurementUnderbust" | "https://schema.org/BodyMeasurementWaist" | "BodyMeasurementWaist" | "https://schema.org/BodyMeasurementWeight" | "BodyMeasurementWeight" | BodyMeasurementTypeEnumerationLeaf;
interface BodyOfWaterLeaf extends PlaceBase {
    "@type": "BodyOfWater";
}
/** A body of water, such as a sea, ocean, or lake. */
export type BodyOfWater = BodyOfWaterLeaf | Canal | LakeBodyOfWater | OceanBodyOfWater | Pond | Reservoir | RiverBodyOfWater | SeaBodyOfWater | Waterfall | string;
interface BoneLeaf extends AnatomicalStructureBase {
    "@type": "Bone";
}
/** Rigid connective tissue that comprises up the skeletal structure of the human body. */
export type Bone = BoneLeaf;
interface BookBase extends CreativeWorkBase {
    /** Indicates whether the book is an abridged edition. */
    "abridged"?: SchemaValue<Boolean, "abridged">;
    /** The edition of the book. */
    "bookEdition"?: SchemaValue<Text, "bookEdition">;
    /** The format of the book. */
    "bookFormat"?: SchemaValue<BookFormatType | IdReference, "bookFormat">;
    /** The illustrator of the book. */
    "illustrator"?: SchemaValue<Person | IdReference, "illustrator">;
    /** The ISBN of the book. */
    "isbn"?: SchemaValue<Text, "isbn">;
    /** The number of pages in the book. */
    "numberOfPages"?: SchemaValue<Integer, "numberOfPages">;
}
interface BookLeaf extends BookBase {
    "@type": "Book";
}
/** A book. */
export type Book = BookLeaf | Audiobook;
interface BookFormatTypeLeaf extends EnumerationBase {
    "@type": "BookFormatType";
}
/** The publication format of the book. */
export type BookFormatType = "https://schema.org/AudiobookFormat" | "AudiobookFormat" | "https://schema.org/EBook" | "EBook" | "https://schema.org/GraphicNovel" | "GraphicNovel" | "https://schema.org/Hardcover" | "Hardcover" | "https://schema.org/Paperback" | "Paperback" | BookFormatTypeLeaf;
interface BookmarkActionLeaf extends ActionBase {
    "@type": "BookmarkAction";
}
/** An agent bookmarks/flags/labels/tags/marks an object. */
export type BookmarkAction = BookmarkActionLeaf;
interface BookSeriesLeaf extends CreativeWorkSeriesBase {
    "@type": "BookSeries";
}
/** A series of books. Included books can be indicated with the hasPart property. */
export type BookSeries = BookSeriesLeaf;
interface BookStoreLeaf extends LocalBusinessBase {
    "@type": "BookStore";
}
/** A bookstore. */
export type BookStore = BookStoreLeaf | string;
interface BorrowActionBase extends TransferActionBase {
    /** A sub property of participant. The person that lends the object being borrowed. */
    "lender"?: SchemaValue<Organization | Person | IdReference, "lender">;
}
interface BorrowActionLeaf extends BorrowActionBase {
    "@type": "BorrowAction";
}
/**
 * The act of obtaining an object under an agreement to return it at a later date. Reciprocal of LendAction.
 *
 * Related actions:
 * - {@link https://schema.org/LendAction LendAction}: Reciprocal of BorrowAction.
 */
export type BorrowAction = BorrowActionLeaf;
interface BowlingAlleyLeaf extends LocalBusinessBase {
    "@type": "BowlingAlley";
}
/** A bowling alley. */
export type BowlingAlley = BowlingAlleyLeaf | string;
interface BrainStructureLeaf extends AnatomicalStructureBase {
    "@type": "BrainStructure";
}
/** Any anatomical structure which pertains to the soft nervous tissue functioning as the coordinating center of sensation and intellectual and nervous activity. */
export type BrainStructure = BrainStructureLeaf;
interface BrandBase extends ThingBase {
    /** The overall rating, based on a collection of reviews or ratings, of the item. */
    "aggregateRating"?: SchemaValue<AggregateRating | IdReference, "aggregateRating">;
    /** An associated logo. */
    "logo"?: SchemaValue<ImageObject | URL | IdReference, "logo">;
    /** A review of the item. */
    "review"?: SchemaValue<Review | IdReference, "review">;
    /** A slogan or motto associated with the item. */
    "slogan"?: SchemaValue<Text, "slogan">;
}
interface BrandLeaf extends BrandBase {
    "@type": "Brand";
}
/** A brand is a name used by an organization or business person for labeling a product, product group, or similar. */
export type Brand = BrandLeaf;
interface BreadcrumbListLeaf extends ItemListBase {
    "@type": "BreadcrumbList";
}
/**
 * A BreadcrumbList is an ItemList consisting of a chain of linked Web pages, typically described using at least their URL and their name, and typically ending with the current page.
 *
 * The {@link https://schema.org/position position} property is used to reconstruct the order of the items in a BreadcrumbList. The convention is that a breadcrumb list has an {@link https://schema.org/itemListOrder itemListOrder} of {@link https://schema.org/ItemListOrderAscending ItemListOrderAscending} (lower values listed first), and that the first items in this list correspond to the "top" or beginning of the breadcrumb trail, e.g. with a site or section homepage. The specific values of 'position' are not assigned meaning for a BreadcrumbList, but they should be integers, e.g. beginning with '1' for the first item in the list.
 */
export type BreadcrumbList = BreadcrumbListLeaf;
interface BreweryLeaf extends FoodEstablishmentBase {
    "@type": "Brewery";
}
/** Brewery. */
export type Brewery = BreweryLeaf | string;
interface BridgeLeaf extends CivicStructureBase {
    "@type": "Bridge";
}
/** A bridge. */
export type Bridge = BridgeLeaf | string;
interface BroadcastChannelBase extends ThingBase {
    /** The unique address by which the BroadcastService can be identified in a provider lineup. In US, this is typically a number. */
    "broadcastChannelId"?: SchemaValue<Text, "broadcastChannelId">;
    /** The frequency used for over-the-air broadcasts. Numeric values or simple ranges, e.g. 87-99. In addition a shortcut idiom is supported for frequencies of AM and FM radio channels, e.g. "87 FM". */
    "broadcastFrequency"?: SchemaValue<BroadcastFrequencySpecification | Text | IdReference, "broadcastFrequency">;
    /** The type of service required to have access to the channel (e.g. Standard or Premium). */
    "broadcastServiceTier"?: SchemaValue<Text, "broadcastServiceTier">;
    /** Genre of the creative work, broadcast channel or group. */
    "genre"?: SchemaValue<Text | URL, "genre">;
    /** The CableOrSatelliteService offering the channel. */
    "inBroadcastLineup"?: SchemaValue<CableOrSatelliteService | IdReference, "inBroadcastLineup">;
    /** The BroadcastService offered on this channel. */
    "providesBroadcastService"?: SchemaValue<BroadcastService | IdReference, "providesBroadcastService">;
}
interface BroadcastChannelLeaf extends BroadcastChannelBase {
    "@type": "BroadcastChannel";
}
/** A unique instance of a BroadcastService on a CableOrSatelliteService lineup. */
export type BroadcastChannel = BroadcastChannelLeaf | RadioChannel | TelevisionChannel;
interface BroadcastEventBase extends PublicationEventBase {
    /** The event being broadcast such as a sporting event or awards ceremony. */
    "broadcastOfEvent"?: SchemaValue<Event | IdReference, "broadcastOfEvent">;
    /** True if the broadcast is of a live event. */
    "isLiveBroadcast"?: SchemaValue<Boolean, "isLiveBroadcast">;
    /** Languages in which subtitles/captions are available, in {@link http://tools.ietf.org/html/bcp47 IETF BCP 47 standard format}. */
    "subtitleLanguage"?: SchemaValue<Language | Text | IdReference, "subtitleLanguage">;
    /** The type of screening or video broadcast used (e.g. IMAX, 3D, SD, HD, etc.). */
    "videoFormat"?: SchemaValue<Text, "videoFormat">;
}
interface BroadcastEventLeaf extends BroadcastEventBase {
    "@type": "BroadcastEvent";
}
/** An over the air or online broadcast event. */
export type BroadcastEvent = BroadcastEventLeaf;
interface BroadcastFrequencySpecificationBase extends ThingBase {
    /** The frequency in MHz for a particular broadcast. */
    "broadcastFrequencyValue"?: SchemaValue<Number | QuantitativeValue | IdReference, "broadcastFrequencyValue">;
    /** The modulation (e.g. FM, AM, etc) used by a particular broadcast service. */
    "broadcastSignalModulation"?: SchemaValue<QualitativeValue | Text | IdReference, "broadcastSignalModulation">;
    /** The subchannel used for the broadcast. */
    "broadcastSubChannel"?: SchemaValue<Text, "broadcastSubChannel">;
}
interface BroadcastFrequencySpecificationLeaf extends BroadcastFrequencySpecificationBase {
    "@type": "BroadcastFrequencySpecification";
}
/** The frequency in MHz and the modulation used for a particular BroadcastService. */
export type BroadcastFrequencySpecification = BroadcastFrequencySpecificationLeaf;
interface BroadcastServiceBase extends ServiceBase {
    /**
     * The area within which users can expect to reach the broadcast service.
     *
     * @deprecated Consider using https://schema.org/serviceArea instead.
     */
    "area"?: SchemaValue<Place | IdReference, "area">;
    /** The media network(s) whose content is broadcast on this station. */
    "broadcastAffiliateOf"?: SchemaValue<Organization | IdReference, "broadcastAffiliateOf">;
    /** The name displayed in the channel guide. For many US affiliates, it is the network name. */
    "broadcastDisplayName"?: SchemaValue<Text, "broadcastDisplayName">;
    /** The organization owning or operating the broadcast service. */
    "broadcaster"?: SchemaValue<Organization | IdReference, "broadcaster">;
    /** The frequency used for over-the-air broadcasts. Numeric values or simple ranges, e.g. 87-99. In addition a shortcut idiom is supported for frequencies of AM and FM radio channels, e.g. "87 FM". */
    "broadcastFrequency"?: SchemaValue<BroadcastFrequencySpecification | Text | IdReference, "broadcastFrequency">;
    /** The timezone in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 format} for which the service bases its broadcasts. */
    "broadcastTimezone"?: SchemaValue<Text, "broadcastTimezone">;
    /** A {@link https://en.wikipedia.org/wiki/Call_sign callsign}, as used in broadcasting and radio communications to identify people, radio and TV stations, or vehicles. */
    "callSign"?: SchemaValue<Text, "callSign">;
    /** A broadcast channel of a broadcast service. */
    "hasBroadcastChannel"?: SchemaValue<BroadcastChannel | IdReference, "hasBroadcastChannel">;
    /** The language of the content or performance or used in an action. Please use one of the language codes from the {@link http://tools.ietf.org/html/bcp47 IETF BCP 47 standard}. See also {@link https://schema.org/availableLanguage availableLanguage}. */
    "inLanguage"?: SchemaValue<Language | Text | IdReference, "inLanguage">;
    /** A broadcast service to which the broadcast service may belong to such as regional variations of a national channel. */
    "parentService"?: SchemaValue<BroadcastService | IdReference, "parentService">;
    /** The type of screening or video broadcast used (e.g. IMAX, 3D, SD, HD, etc.). */
    "videoFormat"?: SchemaValue<Text, "videoFormat">;
}
interface BroadcastServiceLeaf extends BroadcastServiceBase {
    "@type": "BroadcastService";
}
/** A delivery service through which content is provided via broadcast over the air or online. */
export type BroadcastService = BroadcastServiceLeaf | RadioBroadcastService;
interface BrokerageAccountLeaf extends InvestmentOrDepositBase {
    "@type": "BrokerageAccount";
}
/** An account that allows an investor to deposit funds and place investment orders with a licensed broker or brokerage firm. */
export type BrokerageAccount = BrokerageAccountLeaf;
interface BuddhistTempleLeaf extends CivicStructureBase {
    "@type": "BuddhistTemple";
}
/** A Buddhist temple. */
export type BuddhistTemple = BuddhistTempleLeaf | string;
interface BusinessAudienceBase extends AudienceBase {
    /** The number of employees in an organization, e.g. business. */
    "numberOfEmployees"?: SchemaValue<QuantitativeValue | IdReference, "numberOfEmployees">;
    /** The size of the business in annual revenue. */
    "yearlyRevenue"?: SchemaValue<QuantitativeValue | IdReference, "yearlyRevenue">;
    /** The age of the business. */
    "yearsInOperation"?: SchemaValue<QuantitativeValue | IdReference, "yearsInOperation">;
}
interface BusinessAudienceLeaf extends BusinessAudienceBase {
    "@type": "BusinessAudience";
}
/** A set of characteristics belonging to businesses, e.g. who compose an item's target audience. */
export type BusinessAudience = BusinessAudienceLeaf;
interface BusinessEntityTypeLeaf extends EnumerationBase {
    "@type": "BusinessEntityType";
}
/**
 * A business entity type is a conceptual entity representing the legal form, the size, the main line of business, the position in the value chain, or any combination thereof, of an organization or business person.
 *
 * Commonly used values:
 * - http://purl.org/goodrelations/v1#Business
 * - http://purl.org/goodrelations/v1#Enduser
 * - http://purl.org/goodrelations/v1#PublicInstitution
 * - http://purl.org/goodrelations/v1#Reseller
 */
export type BusinessEntityType = BusinessEntityTypeLeaf;
interface BusinessEventLeaf extends EventBase {
    "@type": "BusinessEvent";
}
/** Event type: Business event. */
export type BusinessEvent = BusinessEventLeaf;
interface BusinessFunctionLeaf extends EnumerationBase {
    "@type": "BusinessFunction";
}
/**
 * The business function specifies the type of activity or access (i.e., the bundle of rights) offered by the organization or business person through the offer. Typical are sell, rental or lease, maintenance or repair, manufacture / produce, recycle / dispose, engineering / construction, or installation. Proprietary specifications of access rights are also instances of this class.
 *
 * Commonly used values:
 * - http://purl.org/goodrelations/v1#ConstructionInstallation
 * - http://purl.org/goodrelations/v1#Dispose
 * - http://purl.org/goodrelations/v1#LeaseOut
 * - http://purl.org/goodrelations/v1#Maintain
 * - http://purl.org/goodrelations/v1#ProvideService
 * - http://purl.org/goodrelations/v1#Repair
 * - http://purl.org/goodrelations/v1#Sell
 * - http://purl.org/goodrelations/v1#Buy
 */
export type BusinessFunction = BusinessFunctionLeaf;
interface BusOrCoachBase extends VehicleBase {
    /** The ACRISS Car Classification Code is a code used by many car rental companies, for classifying vehicles. ACRISS stands for Association of Car Rental Industry Systems and Standards. */
    "acrissCode"?: SchemaValue<Text, "acrissCode">;
    /**
     * The permitted total weight of cargo and installations (e.g. a roof rack) on top of the vehicle.
     *
     * Typical unit code(s): KGM for kilogram, LBR for pound
     * - Note 1: You can indicate additional information in the {@link https://schema.org/name name} of the {@link https://schema.org/QuantitativeValue QuantitativeValue} node.
     * - Note 2: You may also link to a {@link https://schema.org/QualitativeValue QualitativeValue} node that provides additional information using {@link https://schema.org/valueReference valueReference}
     * - Note 3: Note that you can use {@link https://schema.org/minValue minValue} and {@link https://schema.org/maxValue maxValue} to indicate ranges.
     */
    "roofLoad"?: SchemaValue<QuantitativeValue | IdReference, "roofLoad">;
}
interface BusOrCoachLeaf extends BusOrCoachBase {
    "@type": "BusOrCoach";
}
/** A bus (also omnibus or autobus) is a road vehicle designed to carry passengers. Coaches are luxury buses, usually in service for long distance travel. */
export type BusOrCoach = BusOrCoachLeaf;
interface BusReservationLeaf extends ReservationBase {
    "@type": "BusReservation";
}
/**
 * A reservation for bus travel.
 *
 * Note: This type is for information about actual reservations, e.g. in confirmation emails or HTML pages with individual confirmations of reservations. For offers of tickets, use {@link https://schema.org/Offer Offer}.
 */
export type BusReservation = BusReservationLeaf;
interface BusStationLeaf extends CivicStructureBase {
    "@type": "BusStation";
}
/** A bus station. */
export type BusStation = BusStationLeaf | string;
interface BusStopLeaf extends CivicStructureBase {
    "@type": "BusStop";
}
/** A bus stop. */
export type BusStop = BusStopLeaf | string;
interface BusTripBase extends TripBase {
    /** The stop or station from which the bus arrives. */
    "arrivalBusStop"?: SchemaValue<BusStation | BusStop | IdReference, "arrivalBusStop">;
    /** The name of the bus (e.g. Bolt Express). */
    "busName"?: SchemaValue<Text, "busName">;
    /** The unique identifier for the bus. */
    "busNumber"?: SchemaValue<Text, "busNumber">;
    /** The stop or station from which the bus departs. */
    "departureBusStop"?: SchemaValue<BusStation | BusStop | IdReference, "departureBusStop">;
}
interface BusTripLeaf extends BusTripBase {
    "@type": "BusTrip";
}
/** A trip on a commercial bus line. */
export type BusTrip = BusTripLeaf;
interface BuyActionBase extends TradeActionBase {
    /** An entity which offers (sells / leases / lends / loans) the services / goods. A seller may also be a provider. */
    "seller"?: SchemaValue<Organization | Person | IdReference, "seller">;
    /**
     * 'vendor' is an earlier term for 'seller'.
     *
     * @deprecated Consider using https://schema.org/seller instead.
     */
    "vendor"?: SchemaValue<Organization | Person | IdReference, "vendor">;
    /**
     * The warranty promise(s) included in the offer.
     *
     * @deprecated Consider using https://schema.org/warranty instead.
     */
    "warrantyPromise"?: SchemaValue<WarrantyPromise | IdReference, "warrantyPromise">;
}
interface BuyActionLeaf extends BuyActionBase {
    "@type": "BuyAction";
}
/** The act of giving money to a seller in exchange for goods or services rendered. An agent buys an object, product, or service from a seller for a price. Reciprocal of SellAction. */
export type BuyAction = BuyActionLeaf;
interface CableOrSatelliteServiceLeaf extends ServiceBase {
    "@type": "CableOrSatelliteService";
}
/** A service which provides access to media programming like TV or radio. Access may be via cable or satellite. */
export type CableOrSatelliteService = CableOrSatelliteServiceLeaf;
interface CafeOrCoffeeShopLeaf extends FoodEstablishmentBase {
    "@type": "CafeOrCoffeeShop";
}
/** A cafe or coffee shop. */
export type CafeOrCoffeeShop = CafeOrCoffeeShopLeaf | string;
interface CampgroundBase extends CivicStructureBase, LodgingBusinessBase {
}
interface CampgroundLeaf extends CampgroundBase {
    "@type": "Campground";
}
/**
 * A camping site, campsite, or {@link https://schema.org/Campground Campground} is a place used for overnight stay in the outdoors, typically containing individual {@link https://schema.org/CampingPitch CampingPitch} locations.
 *
 * In British English a campsite is an area, usually divided into a number of pitches, where people can camp overnight using tents or camper vans or caravans; this British English use of the word is synonymous with the American English expression campground. In American English the term campsite generally means an area where an individual, family, group, or military unit can pitch a tent or park a camper; a campground may contain many campsites (source: Wikipedia, see {@link https://en.wikipedia.org/wiki/Campsite https://en.wikipedia.org/wiki/Campsite}).
 *
 * See also the dedicated {@link /docs/hotels.html document on the use of schema.org for marking up hotels and other forms of accommodations}.
 */
export type Campground = CampgroundLeaf | string;
interface CampingPitchLeaf extends AccommodationBase {
    "@type": "CampingPitch";
}
/**
 * A {@link https://schema.org/CampingPitch CampingPitch} is an individual place for overnight stay in the outdoors, typically being part of a larger camping site, or {@link https://schema.org/Campground Campground}.
 *
 * In British English a campsite, or campground, is an area, usually divided into a number of pitches, where people can camp overnight using tents or camper vans or caravans; this British English use of the word is synonymous with the American English expression campground. In American English the term campsite generally means an area where an individual, family, group, or military unit can pitch a tent or park a camper; a campground may contain many campsites. (Source: Wikipedia, see {@link https://en.wikipedia.org/wiki/Campsite https://en.wikipedia.org/wiki/Campsite}.)
 *
 * See also the dedicated {@link /docs/hotels.html document on the use of schema.org for marking up hotels and other forms of accommodations}.
 */
export type CampingPitch = CampingPitchLeaf | string;
interface CanalLeaf extends PlaceBase {
    "@type": "Canal";
}
/** A canal, like the Panama Canal. */
export type Canal = CanalLeaf | string;
interface CancelActionLeaf extends PlanActionBase {
    "@type": "CancelAction";
}
/**
 * The act of asserting that a future event/action is no longer going to happen.
 *
 * Related actions:
 * - {@link https://schema.org/ConfirmAction ConfirmAction}: The antonym of CancelAction.
 */
export type CancelAction = CancelActionLeaf;
interface CarBase extends VehicleBase {
    /** The ACRISS Car Classification Code is a code used by many car rental companies, for classifying vehicles. ACRISS stands for Association of Car Rental Industry Systems and Standards. */
    "acrissCode"?: SchemaValue<Text, "acrissCode">;
    /**
     * The permitted total weight of cargo and installations (e.g. a roof rack) on top of the vehicle.
     *
     * Typical unit code(s): KGM for kilogram, LBR for pound
     * - Note 1: You can indicate additional information in the {@link https://schema.org/name name} of the {@link https://schema.org/QuantitativeValue QuantitativeValue} node.
     * - Note 2: You may also link to a {@link https://schema.org/QualitativeValue QualitativeValue} node that provides additional information using {@link https://schema.org/valueReference valueReference}
     * - Note 3: Note that you can use {@link https://schema.org/minValue minValue} and {@link https://schema.org/maxValue maxValue} to indicate ranges.
     */
    "roofLoad"?: SchemaValue<QuantitativeValue | IdReference, "roofLoad">;
}
interface CarLeaf extends CarBase {
    "@type": "Car";
}
/** A car is a wheeled, self-powered motor vehicle used for transportation. */
export type Car = CarLeaf;
interface CarUsageTypeLeaf extends EnumerationBase {
    "@type": "CarUsageType";
}
/** A value indicating a special usage of a car, e.g. commercial rental, driving school, or as a taxi. */
export type CarUsageType = "https://schema.org/DrivingSchoolVehicleUsage" | "DrivingSchoolVehicleUsage" | "https://schema.org/RentalVehicleUsage" | "RentalVehicleUsage" | "https://schema.org/TaxiVehicleUsage" | "TaxiVehicleUsage" | CarUsageTypeLeaf;
interface CasinoLeaf extends LocalBusinessBase {
    "@type": "Casino";
}
/** A casino. */
export type Casino = CasinoLeaf | string;
interface CategoryCodeBase extends DefinedTermBase {
    /** A short textual code that uniquely identifies the value. */
    "codeValue"?: SchemaValue<Text, "codeValue">;
    /** A {@link https://schema.org/CategoryCodeSet CategoryCodeSet} that contains this category code. */
    "inCodeSet"?: SchemaValue<CategoryCodeSet | URL | IdReference, "inCodeSet">;
}
interface CategoryCodeLeaf extends CategoryCodeBase {
    "@type": "CategoryCode";
}
/** A Category Code. */
export type CategoryCode = CategoryCodeLeaf | MedicalCode;
interface CategoryCodeSetBase extends DefinedTermSetBase {
    /** A Category code contained in this code set. */
    "hasCategoryCode"?: SchemaValue<CategoryCode | IdReference, "hasCategoryCode">;
}
interface CategoryCodeSetLeaf extends CategoryCodeSetBase {
    "@type": "CategoryCodeSet";
}
/** A set of Category Code values. */
export type CategoryCodeSet = CategoryCodeSetLeaf;
interface CatholicChurchLeaf extends CivicStructureBase {
    "@type": "CatholicChurch";
}
/** A Catholic church. */
export type CatholicChurch = CatholicChurchLeaf | string;
interface CDCPMDRecordBase extends ThingBase {
    /** collectiondate - Date for which patient counts are reported. */
    "cvdCollectionDate"?: SchemaValue<DateTime | Text, "cvdCollectionDate">;
    /** Name of the County of the NHSN facility that this data record applies to. Use {@link https://schema.org/cvdFacilityId cvdFacilityId} to identify the facility. To provide other details, {@link https://schema.org/healthcareReportingData healthcareReportingData} can be used on a {@link https://schema.org/Hospital Hospital} entry. */
    "cvdFacilityCounty"?: SchemaValue<Text, "cvdFacilityCounty">;
    /** Identifier of the NHSN facility that this data record applies to. Use {@link https://schema.org/cvdFacilityCounty cvdFacilityCounty} to indicate the county. To provide other details, {@link https://schema.org/healthcareReportingData healthcareReportingData} can be used on a {@link https://schema.org/Hospital Hospital} entry. */
    "cvdFacilityId"?: SchemaValue<Text, "cvdFacilityId">;
    /** numbeds - HOSPITAL INPATIENT BEDS: Inpatient beds, including all staffed, licensed, and overflow (surge) beds used for inpatients. */
    "cvdNumBeds"?: SchemaValue<Number, "cvdNumBeds">;
    /** numbedsocc - HOSPITAL INPATIENT BED OCCUPANCY: Total number of staffed inpatient beds that are occupied. */
    "cvdNumBedsOcc"?: SchemaValue<Number, "cvdNumBedsOcc">;
    /** numc19died - DEATHS: Patients with suspected or confirmed COVID-19 who died in the hospital, ED, or any overflow location. */
    "cvdNumC19Died"?: SchemaValue<Number, "cvdNumC19Died">;
    /** numc19hopats - HOSPITAL ONSET: Patients hospitalized in an NHSN inpatient care location with onset of suspected or confirmed COVID-19 14 or more days after hospitalization. */
    "cvdNumC19HOPats"?: SchemaValue<Number, "cvdNumC19HOPats">;
    /** numc19hosppats - HOSPITALIZED: Patients currently hospitalized in an inpatient care location who have suspected or confirmed COVID-19. */
    "cvdNumC19HospPats"?: SchemaValue<Number, "cvdNumC19HospPats">;
    /** numc19mechventpats - HOSPITALIZED and VENTILATED: Patients hospitalized in an NHSN inpatient care location who have suspected or confirmed COVID-19 and are on a mechanical ventilator. */
    "cvdNumC19MechVentPats"?: SchemaValue<Number, "cvdNumC19MechVentPats">;
    /** numc19ofmechventpats - ED/OVERFLOW and VENTILATED: Patients with suspected or confirmed COVID-19 who are in the ED or any overflow location awaiting an inpatient bed and on a mechanical ventilator. */
    "cvdNumC19OFMechVentPats"?: SchemaValue<Number, "cvdNumC19OFMechVentPats">;
    /** numc19overflowpats - ED/OVERFLOW: Patients with suspected or confirmed COVID-19 who are in the ED or any overflow location awaiting an inpatient bed. */
    "cvdNumC19OverflowPats"?: SchemaValue<Number, "cvdNumC19OverflowPats">;
    /** numicubeds - ICU BEDS: Total number of staffed inpatient intensive care unit (ICU) beds. */
    "cvdNumICUBeds"?: SchemaValue<Number, "cvdNumICUBeds">;
    /** numicubedsocc - ICU BED OCCUPANCY: Total number of staffed inpatient ICU beds that are occupied. */
    "cvdNumICUBedsOcc"?: SchemaValue<Number, "cvdNumICUBedsOcc">;
    /** numtotbeds - ALL HOSPITAL BEDS: Total number of all inpatient and outpatient beds, including all staffed, ICU, licensed, and overflow (surge) beds used for inpatients or outpatients. */
    "cvdNumTotBeds"?: SchemaValue<Number, "cvdNumTotBeds">;
    /** numvent - MECHANICAL VENTILATORS: Total number of ventilators available. */
    "cvdNumVent"?: SchemaValue<Number, "cvdNumVent">;
    /** numventuse - MECHANICAL VENTILATORS IN USE: Total number of ventilators in use. */
    "cvdNumVentUse"?: SchemaValue<Number, "cvdNumVentUse">;
    /** Publication date of an online listing. */
    "datePosted"?: SchemaValue<Date | DateTime, "datePosted">;
}
interface CDCPMDRecordLeaf extends CDCPMDRecordBase {
    "@type": "CDCPMDRecord";
}
/** A CDCPMDRecord is a data structure representing a record in a CDC tabular data format used for hospital data reporting. See {@link /docs/cdc-covid.html documentation} for details, and the linked CDC materials for authoritative definitions used as the source here. */
export type CDCPMDRecord = CDCPMDRecordLeaf;
interface CemeteryLeaf extends CivicStructureBase {
    "@type": "Cemetery";
}
/** A graveyard. */
export type Cemetery = CemeteryLeaf | string;
interface CertificationBase extends CreativeWorkBase {
    /** The subject matter of the content. */
    "about"?: SchemaValue<Thing | IdReference, "about">;
    /** Date when a certification was last audited. See also {@link https://www.gs1.org/voc/certificationAuditDate gs1:certificationAuditDate}. */
    "auditDate"?: SchemaValue<Date | DateTime, "auditDate">;
    /** Identifier of a certification instance (as registered with an independent certification body). Typically this identifier can be used to consult and verify the certification instance. See also {@link https://www.gs1.org/voc/certificationIdentification gs1:certificationIdentification}. */
    "certificationIdentification"?: SchemaValue<DefinedTerm | Text | IdReference, "certificationIdentification">;
    /** Rating of a certification instance (as defined by an independent certification body). Typically this rating can be used to rate the level to which the requirements of the certification instance are fulfilled. See also {@link https://www.gs1.org/voc/certificationValue gs1:certificationValue}. */
    "certificationRating"?: SchemaValue<Rating | IdReference, "certificationRating">;
    /** Indicates the current status of a certification: active or inactive. See also {@link https://www.gs1.org/voc/certificationStatus gs1:certificationStatus}. */
    "certificationStatus"?: SchemaValue<CertificationStatusEnumeration | IdReference, "certificationStatus">;
    /** Date of first publication or broadcast. For example the date a {@link https://schema.org/CreativeWork CreativeWork} was broadcast or a {@link https://schema.org/Certification Certification} was issued. */
    "datePublished"?: SchemaValue<Date | DateTime, "datePublished">;
    /** Date the content expires and is no longer useful or available. For example a {@link https://schema.org/VideoObject VideoObject} or {@link https://schema.org/NewsArticle NewsArticle} whose availability or relevance is time-limited, a {@link https://schema.org/ClaimReview ClaimReview} fact check whose publisher wants to indicate that it may no longer be relevant (or helpful to highlight) after some date, or a {@link https://schema.org/Certification Certification} the validity has expired. */
    "expires"?: SchemaValue<Date | DateTime, "expires">;
    /** A measurement of an item, For example, the inseam of pants, the wheel size of a bicycle, the gauge of a screw, or the carbon footprint measured for certification by an authority. Usually an exact measurement, but can also be a range of measurements for adjustable products, for example belts and ski bindings. */
    "hasMeasurement"?: SchemaValue<QuantitativeValue | IdReference, "hasMeasurement">;
    /** The organization issuing the item, for example a {@link https://schema.org/Permit Permit}, {@link https://schema.org/Ticket Ticket}, or {@link https://schema.org/Certification Certification}. */
    "issuedBy"?: SchemaValue<Organization | IdReference, "issuedBy">;
    /** An associated logo. */
    "logo"?: SchemaValue<ImageObject | URL | IdReference, "logo">;
    /** The date when the item becomes valid. */
    "validFrom"?: SchemaValue<Date | DateTime, "validFrom">;
    /** The geographic area where the item is valid. Applies for example to a {@link https://schema.org/Permit Permit}, a {@link https://schema.org/Certification Certification}, or an {@link https://schema.org/EducationalOccupationalCredential EducationalOccupationalCredential}. */
    "validIn"?: SchemaValue<AdministrativeArea | IdReference, "validIn">;
}
interface CertificationLeaf extends CertificationBase {
    "@type": "Certification";
}
/** A Certification is an official and authoritative statement about a subject, for example a product, service, person, or organization. A certification is typically issued by an indendent certification body, for example a professional organization or government. It formally attests certain characteristics about the subject, for example Organizations can be ISO certified, Food products can be certified Organic or Vegan, a Person can be a certified professional, a Place can be certified for food processing. There are certifications for many domains: regulatory, organizational, recycling, food, efficiency, educational, ecological, etc. A certification is a form of credential, as are accreditations and licenses. Mapped from the {@link https://www.gs1.org/voc/CertificationDetails gs1:CertificationDetails} class in the GS1 Web Vocabulary. */
export type Certification = CertificationLeaf;
interface CertificationStatusEnumerationLeaf extends EnumerationBase {
    "@type": "CertificationStatusEnumeration";
}
/** Enumerates the different statuses of a Certification (Active and Inactive). */
export type CertificationStatusEnumeration = "https://schema.org/CertificationActive" | "CertificationActive" | "https://schema.org/CertificationInactive" | "CertificationInactive" | CertificationStatusEnumerationLeaf;
interface ChapterBase extends CreativeWorkBase {
    /** The page on which the work ends; for example "138" or "xvi". */
    "pageEnd"?: SchemaValue<Integer | Text, "pageEnd">;
    /** The page on which the work starts; for example "135" or "xiii". */
    "pageStart"?: SchemaValue<Integer | Text, "pageStart">;
    /** Any description of pages that is not separated into pageStart and pageEnd; for example, "1-6, 9, 55" or "10-12, 46-49". */
    "pagination"?: SchemaValue<Text, "pagination">;
}
interface ChapterLeaf extends ChapterBase {
    "@type": "Chapter";
}
/** One of the sections into which a book is divided. A chapter usually has a section number or a name. */
export type Chapter = ChapterLeaf;
interface CheckActionLeaf extends ActionBase {
    "@type": "CheckAction";
}
/** An agent inspects, determines, investigates, inquires, or examines an object's accuracy, quality, condition, or state. */
export type CheckAction = CheckActionLeaf;
interface CheckInActionLeaf extends CommunicateActionBase {
    "@type": "CheckInAction";
}
/**
 * The act of an agent communicating (service provider, social media, etc) their arrival by registering/confirming for a previously reserved service (e.g. flight check-in) or at a place (e.g. hotel), possibly resulting in a result (boarding pass, etc).
 *
 * Related actions:
 * - {@link https://schema.org/CheckOutAction CheckOutAction}: The antonym of CheckInAction.
 * - {@link https://schema.org/ArriveAction ArriveAction}: Unlike ArriveAction, CheckInAction implies that the agent is informing/confirming the start of a previously reserved service.
 * - {@link https://schema.org/ConfirmAction ConfirmAction}: Unlike ConfirmAction, CheckInAction implies that the agent is informing/confirming the _start_ of a previously reserved service rather than its validity/existence.
 */
export type CheckInAction = CheckInActionLeaf;
interface CheckOutActionLeaf extends CommunicateActionBase {
    "@type": "CheckOutAction";
}
/**
 * The act of an agent communicating (service provider, social media, etc) their departure of a previously reserved service (e.g. flight check-in) or place (e.g. hotel).
 *
 * Related actions:
 * - {@link https://schema.org/CheckInAction CheckInAction}: The antonym of CheckOutAction.
 * - {@link https://schema.org/DepartAction DepartAction}: Unlike DepartAction, CheckOutAction implies that the agent is informing/confirming the end of a previously reserved service.
 * - {@link https://schema.org/CancelAction CancelAction}: Unlike CancelAction, CheckOutAction implies that the agent is informing/confirming the end of a previously reserved service.
 */
export type CheckOutAction = CheckOutActionLeaf;
interface CheckoutPageLeaf extends WebPageBase {
    "@type": "CheckoutPage";
}
/** Web page type: Checkout page. */
export type CheckoutPage = CheckoutPageLeaf;
interface ChemicalSubstanceBase extends BioChemEntityBase {
    /** The chemical composition describes the identity and relative ratio of the chemical elements that make up the substance. */
    "chemicalComposition"?: SchemaValue<Text, "chemicalComposition">;
    /** A role played by the BioChemEntity within a chemical context. */
    "chemicalRole"?: SchemaValue<DefinedTerm | IdReference, "chemicalRole">;
    /** Intended use of the BioChemEntity by humans. */
    "potentialUse"?: SchemaValue<DefinedTerm | IdReference, "potentialUse">;
}
interface ChemicalSubstanceLeaf extends ChemicalSubstanceBase {
    "@type": "ChemicalSubstance";
}
/** A chemical substance is 'a portion of matter of constant composition, composed of molecular entities of the same type or of different types' (source: {@link https://www.ebi.ac.uk/chebi/searchId.do?chebiId=59999 ChEBI:59999}). */
export type ChemicalSubstance = ChemicalSubstanceLeaf;
interface ChildCareLeaf extends LocalBusinessBase {
    "@type": "ChildCare";
}
/** A Childcare center. */
export type ChildCare = ChildCareLeaf | string;
interface ChildrensEventLeaf extends EventBase {
    "@type": "ChildrensEvent";
}
/** Event type: Children's event. */
export type ChildrensEvent = ChildrensEventLeaf;
interface ChooseActionBase extends ActionBase {
    /** A sub property of object. The options subject to this action. */
    "actionOption"?: SchemaValue<Text | Thing | IdReference, "actionOption">;
    /**
     * A sub property of object. The options subject to this action.
     *
     * @deprecated Consider using https://schema.org/actionOption instead.
     */
    "option"?: SchemaValue<Text | Thing | IdReference, "option">;
}
interface ChooseActionLeaf extends ChooseActionBase {
    "@type": "ChooseAction";
}
/** The act of expressing a preference from a set of options or a large or unbounded set of choices/options. */
export type ChooseAction = ChooseActionLeaf | VoteAction;
interface ChurchLeaf extends CivicStructureBase {
    "@type": "Church";
}
/** A church. */
export type Church = ChurchLeaf | CatholicChurch | string;
interface CityLeaf extends PlaceBase {
    "@type": "City";
}
/** A city or town. */
export type City = CityLeaf | string;
interface CityHallLeaf extends CivicStructureBase {
    "@type": "CityHall";
}
/** A city hall. */
export type CityHall = CityHallLeaf | string;
interface CivicStructureBase extends PlaceBase {
    /**
     * The general opening hours for a business. Opening hours can be specified as a weekly time range, starting with days, then times per day. Multiple days can be listed with commas ',' separating each day. Day or time ranges are specified using a hyphen '-'.
     * - Days are specified using the following two-letter combinations: `Mo`, `Tu`, `We`, `Th`, `Fr`, `Sa`, `Su`.
     * - Times are specified using 24:00 format. For example, 3pm is specified as `15:00`, 10am as `10:00`.
     * - Here is an example: `<time itemprop="openingHours" datetime="Tu,Th 16:00-20:00">Tuesdays and Thursdays 4-8pm</time>`.
     * - If a business is open 7 days a week, then it can be specified as `<time itemprop="openingHours" datetime="Mo-Su">Monday through Sunday, all day</time>`.
     */
    "openingHours"?: SchemaValue<Text, "openingHours">;
}
interface CivicStructureLeaf extends CivicStructureBase {
    "@type": "CivicStructure";
}
/** A public structure, such as a town hall or concert hall. */
export type CivicStructure = CivicStructureLeaf | Airport | Aquarium | Beach | BoatTerminal | Bridge | BusStation | BusStop | Campground | Cemetery | Crematorium | EducationalOrganization | EventVenue | FireStation | GovernmentBuilding | Hospital | MovieTheater | Museum | MusicVenue | Park | ParkingFacility | PerformingArtsTheater | PlaceOfWorship | Playground | PoliceStation | PublicToilet | RVPark | StadiumOrArena | SubwayStation | TaxiStand | TrainStation | Zoo | string;
interface ClaimBase extends CreativeWorkBase {
    /** Indicates an occurrence of a {@link https://schema.org/Claim Claim} in some {@link https://schema.org/CreativeWork CreativeWork}. */
    "appearance"?: SchemaValue<CreativeWork | IdReference, "appearance">;
    /** For a {@link https://schema.org/Claim Claim} interpreted from {@link https://schema.org/MediaObject MediaObject} content, the {@link https://schema.org/interpretedAsClaim interpretedAsClaim} property can be used to indicate a claim contained, implied or refined from the content of a {@link https://schema.org/MediaObject MediaObject}. */
    "claimInterpreter"?: SchemaValue<Organization | Person | IdReference, "claimInterpreter">;
    /** Indicates the first known occurrence of a {@link https://schema.org/Claim Claim} in some {@link https://schema.org/CreativeWork CreativeWork}. */
    "firstAppearance"?: SchemaValue<CreativeWork | IdReference, "firstAppearance">;
}
interface ClaimLeaf extends ClaimBase {
    "@type": "Claim";
}
/**
 * A {@link https://schema.org/Claim Claim} in Schema.org represents a specific, factually-oriented claim that could be the {@link https://schema.org/itemReviewed itemReviewed} in a {@link https://schema.org/ClaimReview ClaimReview}. The content of a claim can be summarized with the {@link https://schema.org/text text} property. Variations on well known claims can have their common identity indicated via {@link https://schema.org/sameAs sameAs} links, and summarized with a {@link https://schema.org/name name}. Ideally, a {@link https://schema.org/Claim Claim} description includes enough contextual information to minimize the risk of ambiguity or inclarity. In practice, many claims are better understood in the context in which they appear or the interpretations provided by claim reviews.
 *
 * Beyond {@link https://schema.org/ClaimReview ClaimReview}, the Claim type can be associated with related creative works - for example a {@link https://schema.org/ScholarlyArticle ScholarlyArticle} or {@link https://schema.org/Question Question} might be {@link https://schema.org/about about} some {@link https://schema.org/Claim Claim}.
 *
 * At this time, Schema.org does not define any types of relationship between claims. This is a natural area for future exploration.
 */
export type Claim = ClaimLeaf;
interface ClaimReviewBase extends ReviewBase {
    /** A short summary of the specific claims reviewed in a ClaimReview. */
    "claimReviewed"?: SchemaValue<Text, "claimReviewed">;
}
interface ClaimReviewLeaf extends ClaimReviewBase {
    "@type": "ClaimReview";
}
/** A fact-checking review of claims made (or reported) in some creative work (referenced via itemReviewed). */
export type ClaimReview = ClaimReviewLeaf;
interface ClassBase extends ThingBase {
    /** Relates a term (i.e. a property, class or enumeration) to one that supersedes it. */
    "supersededBy"?: SchemaValue<Class | Enumeration | Property | IdReference, "supersededBy">;
}
interface ClassLeaf extends ClassBase {
    "@type": "Class";
}
/** A class, also often called a 'Type'; equivalent to rdfs:Class. */
export type Class = ClassLeaf;
interface ClipBase extends CreativeWorkBase {
    /** An actor (individual or a group), e.g. in TV, radio, movie, video games etc., or in an event. Actors can be associated with individual items or with a series, episode, clip. */
    "actor"?: SchemaValue<PerformingGroup | Person | IdReference, "actor">;
    /**
     * An actor, e.g. in TV, radio, movie, video games etc. Actors can be associated with individual items or with a series, episode, clip.
     *
     * @deprecated Consider using https://schema.org/actor instead.
     */
    "actors"?: SchemaValue<Person | IdReference, "actors">;
    /** Position of the clip within an ordered group of clips. */
    "clipNumber"?: SchemaValue<Integer | Text, "clipNumber">;
    /** A director of e.g. TV, radio, movie, video gaming etc. content, or of an event. Directors can be associated with individual items or with a series, episode, clip. */
    "director"?: SchemaValue<Person | IdReference, "director">;
    /**
     * A director of e.g. TV, radio, movie, video games etc. content. Directors can be associated with individual items or with a series, episode, clip.
     *
     * @deprecated Consider using https://schema.org/director instead.
     */
    "directors"?: SchemaValue<Person | IdReference, "directors">;
    /** The end time of the clip expressed as the number of seconds from the beginning of the work. */
    "endOffset"?: SchemaValue<HyperTocEntry | Number | IdReference, "endOffset">;
    /** The composer of the soundtrack. */
    "musicBy"?: SchemaValue<MusicGroup | Person | IdReference, "musicBy">;
    /** The episode to which this clip belongs. */
    "partOfEpisode"?: SchemaValue<Episode | IdReference, "partOfEpisode">;
    /** The season to which this episode belongs. */
    "partOfSeason"?: SchemaValue<CreativeWorkSeason | IdReference, "partOfSeason">;
    /** The series to which this episode or season belongs. */
    "partOfSeries"?: SchemaValue<CreativeWorkSeries | IdReference, "partOfSeries">;
    /** The start time of the clip expressed as the number of seconds from the beginning of the work. */
    "startOffset"?: SchemaValue<HyperTocEntry | Number | IdReference, "startOffset">;
}
interface ClipLeaf extends ClipBase {
    "@type": "Clip";
}
/** A short TV or radio program or a segment/part of a program. */
export type Clip = ClipLeaf | MovieClip | RadioClip | TVClip | VideoGameClip;
interface ClothingStoreLeaf extends LocalBusinessBase {
    "@type": "ClothingStore";
}
/** A clothing store. */
export type ClothingStore = ClothingStoreLeaf | string;
interface CodeLeaf extends CreativeWorkBase {
    "@type": "Code";
}
/**
 * Computer programming source code. Example: Full (compile ready) solutions, code snippet samples, scripts, templates.
 *
 * @deprecated Use SoftwareSourceCode instead.
 */
export type Code = CodeLeaf;
interface CollectionBase extends CreativeWorkBase {
    /** The number of items in the {@link https://schema.org/Collection Collection}. */
    "collectionSize"?: SchemaValue<Integer, "collectionSize">;
}
interface CollectionLeaf extends CollectionBase {
    "@type": "Collection";
}
/** A collection of items, e.g. creative works or products. */
export type Collection = CollectionLeaf | ProductCollection;
interface CollectionPageLeaf extends WebPageBase {
    "@type": "CollectionPage";
}
/** Web page type: Collection page. */
export type CollectionPage = CollectionPageLeaf | MediaGallery;
interface CollegeOrUniversityLeaf extends EducationalOrganizationBase {
    "@type": "CollegeOrUniversity";
}
/** A college, university, or other third-level educational institution. */
export type CollegeOrUniversity = CollegeOrUniversityLeaf | string;
interface ComedyClubLeaf extends LocalBusinessBase {
    "@type": "ComedyClub";
}
/** A comedy club. */
export type ComedyClub = ComedyClubLeaf | string;
interface ComedyEventLeaf extends EventBase {
    "@type": "ComedyEvent";
}
/** Event type: Comedy event. */
export type ComedyEvent = ComedyEventLeaf;
interface ComicCoverArtBase extends ComicStoryBase, VisualArtworkBase {
}
interface ComicCoverArtLeaf extends ComicCoverArtBase {
    "@type": "ComicCoverArt";
}
/** The artwork on the cover of a comic. */
export type ComicCoverArt = ComicCoverArtLeaf;
interface ComicIssueBase extends PublicationIssueBase {
    /** The primary artist for a work in a medium other than pencils or digital line art--for example, if the primary artwork is done in watercolors or digital paints. */
    "artist"?: SchemaValue<Person | IdReference, "artist">;
    /** The individual who adds color to inked drawings. */
    "colorist"?: SchemaValue<Person | IdReference, "colorist">;
    /** The individual who traces over the pencil drawings in ink after pencils are complete. */
    "inker"?: SchemaValue<Person | IdReference, "inker">;
    /** The individual who adds lettering, including speech balloons and sound effects, to artwork. */
    "letterer"?: SchemaValue<Person | IdReference, "letterer">;
    /** The individual who draws the primary narrative artwork. */
    "penciler"?: SchemaValue<Person | IdReference, "penciler">;
    /** A description of the variant cover for the issue, if the issue is a variant printing. For example, "Bryan Hitch Variant Cover" or "2nd Printing Variant". */
    "variantCover"?: SchemaValue<Text, "variantCover">;
}
interface ComicIssueLeaf extends ComicIssueBase {
    "@type": "ComicIssue";
}
/** Individual comic issues are serially published as part of a larger series. For the sake of consistency, even one-shot issues belong to a series comprised of a single issue. All comic issues can be uniquely identified by: the combination of the name and volume number of the series to which the issue belongs; the issue number; and the variant description of the issue (if any). */
export type ComicIssue = ComicIssueLeaf;
interface ComicSeriesLeaf extends CreativeWorkSeriesBase {
    "@type": "ComicSeries";
}
/** A sequential publication of comic stories under a unifying title, for example "The Amazing Spider-Man" or "Groo the Wanderer". */
export type ComicSeries = ComicSeriesLeaf;
interface ComicStoryBase extends CreativeWorkBase {
    /** The primary artist for a work in a medium other than pencils or digital line art--for example, if the primary artwork is done in watercolors or digital paints. */
    "artist"?: SchemaValue<Person | IdReference, "artist">;
    /** The individual who adds color to inked drawings. */
    "colorist"?: SchemaValue<Person | IdReference, "colorist">;
    /** The individual who traces over the pencil drawings in ink after pencils are complete. */
    "inker"?: SchemaValue<Person | IdReference, "inker">;
    /** The individual who adds lettering, including speech balloons and sound effects, to artwork. */
    "letterer"?: SchemaValue<Person | IdReference, "letterer">;
    /** The individual who draws the primary narrative artwork. */
    "penciler"?: SchemaValue<Person | IdReference, "penciler">;
}
interface ComicStoryLeaf extends ComicStoryBase {
    "@type": "ComicStory";
}
/** The term "story" is any indivisible, re-printable unit of a comic, including the interior stories, covers, and backmatter. Most comics have at least two stories: a cover (ComicCoverArt) and an interior story. */
export type ComicStory = ComicStoryLeaf | ComicCoverArt;
interface CommentBase extends CreativeWorkBase {
    /** The number of downvotes this question, answer or comment has received from the community. */
    "downvoteCount"?: SchemaValue<Integer, "downvoteCount">;
    /** The parent of a question, answer or item in general. Typically used for Q/A discussion threads e.g. a chain of comments with the first comment being an {@link https://schema.org/Article Article} or other {@link https://schema.org/CreativeWork CreativeWork}. See also {@link https://schema.org/comment comment} which points from something to a comment about it. */
    "parentItem"?: SchemaValue<Comment | CreativeWork | IdReference, "parentItem">;
    /** A CreativeWork such as an image, video, or audio clip shared as part of this posting. */
    "sharedContent"?: SchemaValue<CreativeWork | IdReference, "sharedContent">;
    /** The number of upvotes this question, answer or comment has received from the community. */
    "upvoteCount"?: SchemaValue<Integer, "upvoteCount">;
}
interface CommentLeaf extends CommentBase {
    "@type": "Comment";
}
/** A comment on an item - for example, a comment on a blog post. The comment's content is expressed via the {@link https://schema.org/text text} property, and its topic via {@link https://schema.org/about about}, properties shared with all CreativeWorks. */
export type Comment = CommentLeaf | Answer | CorrectionComment | Question;
interface CommentActionBase extends CommunicateActionBase {
    /** A sub property of result. The Comment created or sent as a result of this action. */
    "resultComment"?: SchemaValue<Comment | IdReference, "resultComment">;
}
interface CommentActionLeaf extends CommentActionBase {
    "@type": "CommentAction";
}
/** The act of generating a comment about a subject. */
export type CommentAction = CommentActionLeaf;
interface CommunicateActionBase extends ActionBase {
    /** The subject matter of the content. */
    "about"?: SchemaValue<Thing | IdReference, "about">;
    /** The language of the content or performance or used in an action. Please use one of the language codes from the {@link http://tools.ietf.org/html/bcp47 IETF BCP 47 standard}. See also {@link https://schema.org/availableLanguage availableLanguage}. */
    "inLanguage"?: SchemaValue<Language | Text | IdReference, "inLanguage">;
    /**
     * A sub property of instrument. The language used on this action.
     *
     * @deprecated Consider using https://schema.org/inLanguage instead.
     */
    "language"?: SchemaValue<Language | IdReference, "language">;
    /** A sub property of participant. The participant who is at the receiving end of the action. */
    "recipient"?: SchemaValue<Audience | ContactPoint | Organization | Person | IdReference, "recipient">;
}
interface CommunicateActionLeaf extends CommunicateActionBase {
    "@type": "CommunicateAction";
}
/** The act of conveying information to another person via a communication medium (instrument) such as speech, email, or telephone conversation. */
export type CommunicateAction = CommunicateActionLeaf | AskAction | CheckInAction | CheckOutAction | CommentAction | InformAction | InviteAction | ReplyAction | ShareAction;
interface CommunityHealthLeaf extends LocalBusinessBase {
    "@type": "CommunityHealth";
}
/** A field of public health focusing on improving health characteristics of a defined population in relation with their geographical or environment areas. */
export type CommunityHealth = CommunityHealthLeaf | string;
interface CompleteDataFeedLeaf extends DataFeedBase {
    "@type": "CompleteDataFeed";
}
/**
 * A {@link https://schema.org/CompleteDataFeed CompleteDataFeed} is a {@link https://schema.org/DataFeed DataFeed} whose standard representation includes content for every item currently in the feed.
 *
 * This is the equivalent of Atom's element as defined in Feed Paging and Archiving {@link https://tools.ietf.org/html/rfc5005 RFC 5005}, for example (and as defined for Atom), when using data from a feed that represents a collection of items that varies over time (e.g. "Top Twenty Records") there is no need to have newer entries mixed in alongside older, obsolete entries. By marking this feed as a CompleteDataFeed, old entries can be safely discarded when the feed is refreshed, since we can assume the feed has provided descriptions for all current items.
 */
export type CompleteDataFeed = CompleteDataFeedLeaf;
interface CompoundPriceSpecificationBase extends PriceSpecificationBase {
    /** This property links to all {@link https://schema.org/UnitPriceSpecification UnitPriceSpecification} nodes that apply in parallel for the {@link https://schema.org/CompoundPriceSpecification CompoundPriceSpecification} node. */
    "priceComponent"?: SchemaValue<UnitPriceSpecification | IdReference, "priceComponent">;
    /** Defines the type of a price specified for an offered product, for example a list price, a (temporary) sale price or a manufacturer suggested retail price. If multiple prices are specified for an offer the {@link https://schema.org/priceType priceType} property can be used to identify the type of each such specified price. The value of priceType can be specified as a value from enumeration PriceTypeEnumeration or as a free form text string for price types that are not already predefined in PriceTypeEnumeration. */
    "priceType"?: SchemaValue<PriceTypeEnumeration | Text | IdReference, "priceType">;
}
interface CompoundPriceSpecificationLeaf extends CompoundPriceSpecificationBase {
    "@type": "CompoundPriceSpecification";
}
/** A compound price specification is one that bundles multiple prices that all apply in combination for different dimensions of consumption. Use the name property of the attached unit price specification for indicating the dimension of a price component (e.g. "electricity" or "final cleaning"). */
export type CompoundPriceSpecification = CompoundPriceSpecificationLeaf;
interface ComputerLanguageLeaf extends ThingBase {
    "@type": "ComputerLanguage";
}
/** This type covers computer programming languages such as Scheme and Lisp, as well as other language-like computer representations. Natural languages are best represented with the {@link https://schema.org/Language Language} type. */
export type ComputerLanguage = ComputerLanguageLeaf;
interface ComputerStoreLeaf extends LocalBusinessBase {
    "@type": "ComputerStore";
}
/** A computer store. */
export type ComputerStore = ComputerStoreLeaf | string;
interface ConfirmActionLeaf extends InformActionBase {
    "@type": "ConfirmAction";
}
/**
 * The act of notifying someone that a future event/action is going to happen as expected.
 *
 * Related actions:
 * - {@link https://schema.org/CancelAction CancelAction}: The antonym of ConfirmAction.
 */
export type ConfirmAction = ConfirmActionLeaf;
interface ConsortiumLeaf extends OrganizationBase {
    "@type": "Consortium";
}
/** A Consortium is a membership {@link https://schema.org/Organization Organization} whose members are typically Organizations. */
export type Consortium = ConsortiumLeaf | string;
interface ConstraintNodeBase extends ThingBase {
    /** Indicates a property used as a constraint. For example, in the definition of a {@link https://schema.org/StatisticalVariable StatisticalVariable}. The value is a property, either from within Schema.org or from other compatible (e.g. RDF) systems such as DataCommons.org or Wikidata.org. */
    "constraintProperty"?: SchemaValue<Property | URL | IdReference, "constraintProperty">;
    /** Indicates the number of constraints property values defined for a particular {@link https://schema.org/ConstraintNode ConstraintNode} such as {@link https://schema.org/StatisticalVariable StatisticalVariable}. This helps applications understand if they have access to a sufficiently complete description of a {@link https://schema.org/StatisticalVariable StatisticalVariable} or other construct that is defined using properties on template-style nodes. */
    "numConstraints"?: SchemaValue<Integer, "numConstraints">;
}
interface ConstraintNodeLeaf extends ConstraintNodeBase {
    "@type": "ConstraintNode";
}
/** The ConstraintNode type is provided to support usecases in which a node in a structured data graph is described with properties which appear to describe a single entity, but are being used in a situation where they serve a more abstract purpose. A {@link https://schema.org/ConstraintNode ConstraintNode} can be described using {@link https://schema.org/constraintProperty constraintProperty} and {@link https://schema.org/numConstraints numConstraints}. These constraint properties can serve a variety of purposes, and their values may sometimes be understood to indicate sets of possible values rather than single, exact and specific values. */
export type ConstraintNode = ConstraintNodeLeaf | StatisticalVariable;
interface ConsumeActionBase extends ActionBase {
    /** A set of requirements that must be fulfilled in order to perform an Action. If more than one value is specified, fulfilling one set of requirements will allow the Action to be performed. */
    "actionAccessibilityRequirement"?: SchemaValue<ActionAccessSpecification | IdReference, "actionAccessibilityRequirement">;
    /** An Offer which must be accepted before the user can perform the Action. For example, the user may need to buy a movie before being able to watch it. */
    "expectsAcceptanceOf"?: SchemaValue<Offer | IdReference, "expectsAcceptanceOf">;
}
interface ConsumeActionLeaf extends ConsumeActionBase {
    "@type": "ConsumeAction";
}
/** The act of ingesting information/resources/food. */
export type ConsumeAction = ConsumeActionLeaf | DrinkAction | EatAction | InstallAction | ListenAction | PlayGameAction | ReadAction | UseAction | ViewAction | WatchAction;
interface ContactPageLeaf extends WebPageBase {
    "@type": "ContactPage";
}
/** Web page type: Contact page. */
export type ContactPage = ContactPageLeaf;
interface ContactPointBase extends ThingBase {
    /** The geographic area where a service or offered item is provided. */
    "areaServed"?: SchemaValue<AdministrativeArea | GeoShape | Place | Text | IdReference, "areaServed">;
    /** A language someone may use with or at the item, service or place. Please use one of the language codes from the {@link http://tools.ietf.org/html/bcp47 IETF BCP 47 standard}. See also {@link https://schema.org/inLanguage inLanguage}. */
    "availableLanguage"?: SchemaValue<Language | Text | IdReference, "availableLanguage">;
    /** An option available on this contact point (e.g. a toll-free number or support for hearing-impaired callers). */
    "contactOption"?: SchemaValue<ContactPointOption | IdReference, "contactOption">;
    /** A person or organization can have different contact points, for different purposes. For example, a sales contact point, a PR contact point and so on. This property is used to specify the kind of contact point. */
    "contactType"?: SchemaValue<Text, "contactType">;
    /** Email address. */
    "email"?: SchemaValue<Text, "email">;
    /** The fax number. */
    "faxNumber"?: SchemaValue<Text, "faxNumber">;
    /** The hours during which this service or contact is available. */
    "hoursAvailable"?: SchemaValue<OpeningHoursSpecification | IdReference, "hoursAvailable">;
    /** The product or service this support contact point is related to (such as product support for a particular product line). This can be a specific product or product line (e.g. "iPhone") or a general category of products or services (e.g. "smartphones"). */
    "productSupported"?: SchemaValue<Product | Text | IdReference, "productSupported">;
    /**
     * The geographic area where the service is provided.
     *
     * @deprecated Consider using https://schema.org/areaServed instead.
     */
    "serviceArea"?: SchemaValue<AdministrativeArea | GeoShape | Place | IdReference, "serviceArea">;
    /** The telephone number. */
    "telephone"?: SchemaValue<Text, "telephone">;
}
interface ContactPointLeaf extends ContactPointBase {
    "@type": "ContactPoint";
}
/** A contact point—for example, a Customer Complaints department. */
export type ContactPoint = ContactPointLeaf | PostalAddress;
interface ContactPointOptionLeaf extends EnumerationBase {
    "@type": "ContactPointOption";
}
/** Enumerated options related to a ContactPoint. */
export type ContactPointOption = "https://schema.org/HearingImpairedSupported" | "HearingImpairedSupported" | "https://schema.org/TollFree" | "TollFree" | ContactPointOptionLeaf;
interface ContinentLeaf extends PlaceBase {
    "@type": "Continent";
}
/** One of the continents (for example, Europe or Africa). */
export type Continent = ContinentLeaf | string;
interface ControlActionLeaf extends ActionBase {
    "@type": "ControlAction";
}
/** An agent controls a device or application. */
export type ControlAction = ControlActionLeaf | ActivateAction | DeactivateAction | ResumeAction | SuspendAction;
interface ConvenienceStoreLeaf extends LocalBusinessBase {
    "@type": "ConvenienceStore";
}
/** A convenience store. */
export type ConvenienceStore = ConvenienceStoreLeaf | string;
interface ConversationLeaf extends CreativeWorkBase {
    "@type": "Conversation";
}
/** One or more messages between organizations or people on a particular topic. Individual messages can be linked to the conversation with isPartOf or hasPart properties. */
export type Conversation = ConversationLeaf;
interface CookActionBase extends ActionBase {
    /** A sub property of location. The specific food establishment where the action occurred. */
    "foodEstablishment"?: SchemaValue<FoodEstablishment | Place | IdReference, "foodEstablishment">;
    /** A sub property of location. The specific food event where the action occurred. */
    "foodEvent"?: SchemaValue<FoodEvent | IdReference, "foodEvent">;
    /** A sub property of instrument. The recipe/instructions used to perform the action. */
    "recipe"?: SchemaValue<Recipe | IdReference, "recipe">;
}
interface CookActionLeaf extends CookActionBase {
    "@type": "CookAction";
}
/** The act of producing/preparing food. */
export type CookAction = CookActionLeaf;
interface CorporationBase extends OrganizationBase {
    /** The exchange traded instrument associated with a Corporation object. The tickerSymbol is expressed as an exchange and an instrument name separated by a space character. For the exchange component of the tickerSymbol attribute, we recommend using the controlled vocabulary of Market Identifier Codes (MIC) specified in ISO 15022. */
    "tickerSymbol"?: SchemaValue<Text, "tickerSymbol">;
}
interface CorporationLeaf extends CorporationBase {
    "@type": "Corporation";
}
/** Organization: A business corporation. */
export type Corporation = CorporationLeaf | string;
interface CorrectionCommentLeaf extends CommentBase {
    "@type": "CorrectionComment";
}
/** A {@link https://schema.org/comment comment} that corrects {@link https://schema.org/CreativeWork CreativeWork}. */
export type CorrectionComment = CorrectionCommentLeaf;
interface CountryLeaf extends PlaceBase {
    "@type": "Country";
}
/** A country. */
export type Country = CountryLeaf | string;
interface CourseBase extends CreativeWorkBase, LearningResourceBase {
    /** A language someone may use with or at the item, service or place. Please use one of the language codes from the {@link http://tools.ietf.org/html/bcp47 IETF BCP 47 standard}. See also {@link https://schema.org/inLanguage inLanguage}. */
    "availableLanguage"?: SchemaValue<Language | Text | IdReference, "availableLanguage">;
    /** The identifier for the {@link https://schema.org/Course Course} used by the course {@link https://schema.org/provider provider} (e.g. CS101 or 6.001). */
    "courseCode"?: SchemaValue<Text, "courseCode">;
    /** Requirements for taking the Course. May be completion of another {@link https://schema.org/Course Course} or a textual description like "permission of instructor". Requirements may be a pre-requisite competency, referenced using {@link https://schema.org/AlignmentObject AlignmentObject}. */
    "coursePrerequisites"?: SchemaValue<AlignmentObject | Course | Text | IdReference, "coursePrerequisites">;
    /** A description of the qualification, award, certificate, diploma or other educational credential awarded as a consequence of successful completion of this course or program. */
    "educationalCredentialAwarded"?: SchemaValue<EducationalOccupationalCredential | Text | URL | IdReference, "educationalCredentialAwarded">;
    /** A financial aid type or program which students may use to pay for tuition or fees associated with the program. */
    "financialAidEligible"?: SchemaValue<DefinedTerm | Text | IdReference, "financialAidEligible">;
    /** An offering of the course at a specific time and place or through specific media or mode of study or to a specific section of students. */
    "hasCourseInstance"?: SchemaValue<CourseInstance | IdReference, "hasCourseInstance">;
    /** The number of credits or units awarded by a Course or required to complete an EducationalOccupationalProgram. */
    "numberOfCredits"?: SchemaValue<Integer | StructuredValue | IdReference, "numberOfCredits">;
    /** A description of the qualification, award, certificate, diploma or other occupational credential awarded as a consequence of successful completion of this course or program. */
    "occupationalCredentialAwarded"?: SchemaValue<EducationalOccupationalCredential | Text | URL | IdReference, "occupationalCredentialAwarded">;
    /** Indicates (typically several) Syllabus entities that lay out what each section of the overall course will cover. */
    "syllabusSections"?: SchemaValue<Syllabus | IdReference, "syllabusSections">;
    /** The total number of students that have enrolled in the history of the course. */
    "totalHistoricalEnrollment"?: SchemaValue<Integer, "totalHistoricalEnrollment">;
}
interface CourseLeaf extends CourseBase {
    "@type": "Course";
}
/** A description of an educational course which may be offered as distinct instances which take place at different times or take place at different locations, or be offered through different media or modes of study. An educational course is a sequence of one or more educational events and/or creative works which aims to build knowledge, competence or ability of learners. */
export type Course = CourseLeaf;
interface CourseInstanceBase extends EventBase {
    /** The medium or means of delivery of the course instance or the mode of study, either as a text label (e.g. "online", "onsite" or "blended"; "synchronous" or "asynchronous"; "full-time" or "part-time") or as a URL reference to a term from a controlled vocabulary (e.g. https://ceds.ed.gov/element/001311#Asynchronous). */
    "courseMode"?: SchemaValue<Text | URL, "courseMode">;
    /** Represents the length and pace of a course, expressed as a {@link https://schema.org/Schedule Schedule}. */
    "courseSchedule"?: SchemaValue<Schedule | IdReference, "courseSchedule">;
    /** The amount of work expected of students taking the course, often provided as a figure per week or per month, and may be broken down by type. For example, "2 hours of lectures, 1 hour of lab work and 3 hours of independent study per week". */
    "courseWorkload"?: SchemaValue<Text, "courseWorkload">;
    /** A person assigned to instruct or provide instructional assistance for the {@link https://schema.org/CourseInstance CourseInstance}. */
    "instructor"?: SchemaValue<Person | IdReference, "instructor">;
}
interface CourseInstanceLeaf extends CourseInstanceBase {
    "@type": "CourseInstance";
}
/** An instance of a {@link https://schema.org/Course Course} which is distinct from other instances because it is offered at a different time or location or through different media or modes of study or to a specific section of students. */
export type CourseInstance = CourseInstanceLeaf;
interface CourthouseLeaf extends CivicStructureBase {
    "@type": "Courthouse";
}
/** A courthouse. */
export type Courthouse = CourthouseLeaf | string;
interface CoverArtLeaf extends VisualArtworkBase {
    "@type": "CoverArt";
}
/** The artwork on the outer surface of a CreativeWork. */
export type CoverArt = CoverArtLeaf | ComicCoverArt;
interface CovidTestingFacilityLeaf extends MedicalClinicBase {
    "@type": "CovidTestingFacility";
}
/** A CovidTestingFacility is a {@link https://schema.org/MedicalClinic MedicalClinic} where testing for the COVID-19 Coronavirus disease is available. If the facility is being made available from an established {@link https://schema.org/Pharmacy Pharmacy}, {@link https://schema.org/Hotel Hotel}, or other non-medical organization, multiple types can be listed. This makes it easier to re-use existing schema.org information about that place, e.g. contact info, address, opening hours. Note that in an emergency, such information may not always be reliable. */
export type CovidTestingFacility = CovidTestingFacilityLeaf | string;
interface CreateActionLeaf extends ActionBase {
    "@type": "CreateAction";
}
/** The act of deliberately creating/producing/generating/building a result out of the agent. */
export type CreateAction = CreateActionLeaf | CookAction | DrawAction | FilmAction | PaintAction | PhotographAction | WriteAction;
interface CreativeWorkBase extends ThingBase {
    /** The subject matter of the content. */
    "about"?: SchemaValue<Thing | IdReference, "about">;
    /** An abstract is a short description that summarizes a {@link https://schema.org/CreativeWork CreativeWork}. */
    "abstract"?: SchemaValue<Text, "abstract">;
    /** Indicates that the resource is compatible with the referenced accessibility API. Values should be drawn from the {@link https://www.w3.org/2021/a11y-discov-vocab/latest/#accessibilityAPI-vocabulary approved vocabulary}. */
    "accessibilityAPI"?: SchemaValue<Text, "accessibilityAPI">;
    /** Identifies input methods that are sufficient to fully control the described resource. Values should be drawn from the {@link https://www.w3.org/2021/a11y-discov-vocab/latest/#accessibilityControl-vocabulary approved vocabulary}. */
    "accessibilityControl"?: SchemaValue<Text, "accessibilityControl">;
    /** Content features of the resource, such as accessible media, alternatives and supported enhancements for accessibility. Values should be drawn from the {@link https://www.w3.org/2021/a11y-discov-vocab/latest/#accessibilityFeature-vocabulary approved vocabulary}. */
    "accessibilityFeature"?: SchemaValue<Text, "accessibilityFeature">;
    /** A characteristic of the described resource that is physiologically dangerous to some users. Related to WCAG 2.0 guideline 2.3. Values should be drawn from the {@link https://www.w3.org/2021/a11y-discov-vocab/latest/#accessibilityHazard-vocabulary approved vocabulary}. */
    "accessibilityHazard"?: SchemaValue<Text, "accessibilityHazard">;
    /** A human-readable summary of specific accessibility features or deficiencies, consistent with the other accessibility metadata but expressing subtleties such as "short descriptions are present but long descriptions will be needed for non-visual users" or "short descriptions are present and no long descriptions are needed". */
    "accessibilitySummary"?: SchemaValue<Text, "accessibilitySummary">;
    /** The human sensory perceptual system or cognitive faculty through which a person may process or perceive information. Values should be drawn from the {@link https://www.w3.org/2021/a11y-discov-vocab/latest/#accessMode-vocabulary approved vocabulary}. */
    "accessMode"?: SchemaValue<Text, "accessMode">;
    /** A list of single or combined accessModes that are sufficient to understand all the intellectual content of a resource. Values should be drawn from the {@link https://www.w3.org/2021/a11y-discov-vocab/latest/#accessModeSufficient-vocabulary approved vocabulary}. */
    "accessModeSufficient"?: SchemaValue<ItemList | IdReference, "accessModeSufficient">;
    /** Specifies the Person that is legally accountable for the CreativeWork. */
    "accountablePerson"?: SchemaValue<Person | IdReference, "accountablePerson">;
    /** Indicates a page documenting how licenses can be purchased or otherwise acquired, for the current item. */
    "acquireLicensePage"?: SchemaValue<CreativeWork | URL | IdReference, "acquireLicensePage">;
    /** The overall rating, based on a collection of reviews or ratings, of the item. */
    "aggregateRating"?: SchemaValue<AggregateRating | IdReference, "aggregateRating">;
    /** A secondary title of the CreativeWork. */
    "alternativeHeadline"?: SchemaValue<Text, "alternativeHeadline">;
    /** Indicates a page or other link involved in archival of a {@link https://schema.org/CreativeWork CreativeWork}. In the case of {@link https://schema.org/MediaReview MediaReview}, the items in a {@link https://schema.org/MediaReviewItem MediaReviewItem} may often become inaccessible, but be archived by archival, journalistic, activist, or law enforcement organizations. In such cases, the referenced page may not directly publish the content. */
    "archivedAt"?: SchemaValue<URL | WebPage | IdReference, "archivedAt">;
    /** The item being described is intended to assess the competency or learning outcome defined by the referenced term. */
    "assesses"?: SchemaValue<DefinedTerm | Text | IdReference, "assesses">;
    /** A media object that encodes this CreativeWork. This property is a synonym for encoding. */
    "associatedMedia"?: SchemaValue<MediaObject | IdReference, "associatedMedia">;
    /** An intended audience, i.e. a group for whom something was created. */
    "audience"?: SchemaValue<Audience | IdReference, "audience">;
    /** An embedded audio object. */
    "audio"?: SchemaValue<AudioObject | Clip | MusicRecording | IdReference, "audio">;
    /** The author of this content or rating. Please note that author is special in that HTML 5 provides a special mechanism for indicating authorship via the rel tag. That is equivalent to this and may be used interchangeably. */
    "author"?: SchemaValue<Organization | Person | IdReference, "author">;
    /** An award won by or for this item. */
    "award"?: SchemaValue<Text, "award">;
    /**
     * Awards won by or for this item.
     *
     * @deprecated Consider using https://schema.org/award instead.
     */
    "awards"?: SchemaValue<Text, "awards">;
    /** Fictional person connected with a creative work. */
    "character"?: SchemaValue<Person | IdReference, "character">;
    /** A citation or reference to another creative work, such as another publication, web page, scholarly article, etc. */
    "citation"?: SchemaValue<CreativeWork | Text | IdReference, "citation">;
    /** Comments, typically from users. */
    "comment"?: SchemaValue<Comment | IdReference, "comment">;
    /** The number of comments this CreativeWork (e.g. Article, Question or Answer) has received. This is most applicable to works published in Web sites with commenting system; additional comments may exist elsewhere. */
    "commentCount"?: SchemaValue<Integer, "commentCount">;
    /**
     * Conditions that affect the availability of, or method(s) of access to, an item. Typically used for real world items such as an {@link https://schema.org/ArchiveComponent ArchiveComponent} held by an {@link https://schema.org/ArchiveOrganization ArchiveOrganization}. This property is not suitable for use as a general Web access control mechanism. It is expressed only in natural language.
     *
     * For example "Available by appointment from the Reading Room" or "Accessible only from logged-in accounts ".
     */
    "conditionsOfAccess"?: SchemaValue<Text, "conditionsOfAccess">;
    /** The location depicted or described in the content. For example, the location in a photograph or painting. */
    "contentLocation"?: SchemaValue<Place | IdReference, "contentLocation">;
    /** Official rating of a piece of content—for example, 'MPAA PG-13'. */
    "contentRating"?: SchemaValue<Rating | Text | IdReference, "contentRating">;
    /** The specific time described by a creative work, for works (e.g. articles, video objects etc.) that emphasise a particular moment within an Event. */
    "contentReferenceTime"?: SchemaValue<DateTime, "contentReferenceTime">;
    /** A secondary contributor to the CreativeWork or Event. */
    "contributor"?: SchemaValue<Organization | Person | IdReference, "contributor">;
    /** The party holding the legal copyright to the CreativeWork. */
    "copyrightHolder"?: SchemaValue<Organization | Person | IdReference, "copyrightHolder">;
    /** Text of a notice appropriate for describing the copyright aspects of this Creative Work, ideally indicating the owner of the copyright for the Work. */
    "copyrightNotice"?: SchemaValue<Text, "copyrightNotice">;
    /** The year during which the claimed copyright for the CreativeWork was first asserted. */
    "copyrightYear"?: SchemaValue<Number, "copyrightYear">;
    /** Indicates a correction to a {@link https://schema.org/CreativeWork CreativeWork}, either via a {@link https://schema.org/CorrectionComment CorrectionComment}, textually or in another document. */
    "correction"?: SchemaValue<CorrectionComment | Text | URL | IdReference, "correction">;
    /**
     * The country of origin of something, including products as well as creative works such as movie and TV content.
     *
     * In the case of TV and movie, this would be the country of the principle offices of the production company or individual responsible for the movie. For other kinds of {@link https://schema.org/CreativeWork CreativeWork} it is difficult to provide fully general guidance, and properties such as {@link https://schema.org/contentLocation contentLocation} and {@link https://schema.org/locationCreated locationCreated} may be more applicable.
     *
     * In the case of products, the country of origin of the product. The exact interpretation of this may vary by context and product type, and cannot be fully enumerated here.
     */
    "countryOfOrigin"?: SchemaValue<Country | IdReference, "countryOfOrigin">;
    /** The status of a creative work in terms of its stage in a lifecycle. Example terms include Incomplete, Draft, Published, Obsolete. Some organizations define a set of terms for the stages of their publication lifecycle. */
    "creativeWorkStatus"?: SchemaValue<DefinedTerm | Text | IdReference, "creativeWorkStatus">;
    /** The creator/author of this CreativeWork. This is the same as the Author property for CreativeWork. */
    "creator"?: SchemaValue<Organization | Person | IdReference, "creator">;
    /** Text that can be used to credit person(s) and/or organization(s) associated with a published Creative Work. */
    "creditText"?: SchemaValue<Text, "creditText">;
    /** The date on which the CreativeWork was created or the item was added to a DataFeed. */
    "dateCreated"?: SchemaValue<Date | DateTime, "dateCreated">;
    /** The date on which the CreativeWork was most recently modified or when the item's entry was modified within a DataFeed. */
    "dateModified"?: SchemaValue<Date | DateTime, "dateModified">;
    /** Date of first publication or broadcast. For example the date a {@link https://schema.org/CreativeWork CreativeWork} was broadcast or a {@link https://schema.org/Certification Certification} was issued. */
    "datePublished"?: SchemaValue<Date | DateTime, "datePublished">;
    /** Indicates an IPTCDigitalSourceEnumeration code indicating the nature of the digital source(s) for some {@link https://schema.org/CreativeWork CreativeWork}. */
    "digitalSourceType"?: SchemaValue<IPTCDigitalSourceEnumeration | IdReference, "digitalSourceType">;
    /** A link to the page containing the comments of the CreativeWork. */
    "discussionUrl"?: SchemaValue<URL, "discussionUrl">;
    /**
     * An {@link https://eidr.org/ EIDR} (Entertainment Identifier Registry) {@link https://schema.org/identifier identifier} representing a specific edit / edition for a work of film or television.
     *
     * For example, the motion picture known as "Ghostbusters" whose {@link https://schema.org/titleEIDR titleEIDR} is "10.5240/7EC7-228A-510A-053E-CBB8-J" has several edits, e.g. "10.5240/1F2A-E1C5-680A-14C6-E76B-I" and "10.5240/8A35-3BEE-6497-5D12-9E4F-3".
     *
     * Since schema.org types like {@link https://schema.org/Movie Movie} and {@link https://schema.org/TVEpisode TVEpisode} can be used for both works and their multiple expressions, it is possible to use {@link https://schema.org/titleEIDR titleEIDR} alone (for a general description), or alongside {@link https://schema.org/editEIDR editEIDR} for a more edit-specific description.
     */
    "editEIDR"?: SchemaValue<Text | URL, "editEIDR">;
    /** Specifies the Person who edited the CreativeWork. */
    "editor"?: SchemaValue<Person | IdReference, "editor">;
    /**
     * An alignment to an established educational framework.
     *
     * This property should not be used where the nature of the alignment can be described using a simple property, for example to express that a resource {@link https://schema.org/teaches teaches} or {@link https://schema.org/assesses assesses} a competency.
     */
    "educationalAlignment"?: SchemaValue<AlignmentObject | IdReference, "educationalAlignment">;
    /** The level in terms of progression through an educational or training context. Examples of educational levels include 'beginner', 'intermediate' or 'advanced', and formal sets of level indicators. */
    "educationalLevel"?: SchemaValue<DefinedTerm | Text | URL | IdReference, "educationalLevel">;
    /** The purpose of a work in the context of education; for example, 'assignment', 'group work'. */
    "educationalUse"?: SchemaValue<DefinedTerm | Text | IdReference, "educationalUse">;
    /** A media object that encodes this CreativeWork. This property is a synonym for associatedMedia. */
    "encoding"?: SchemaValue<MediaObject | IdReference, "encoding">;
    /**
     * Media type typically expressed using a MIME format (see {@link http://www.iana.org/assignments/media-types/media-types.xhtml IANA site} and {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types MDN reference}), e.g. application/zip for a SoftwareApplication binary, audio/mpeg for .mp3 etc.
     *
     * In cases where a {@link https://schema.org/CreativeWork CreativeWork} has several media type representations, {@link https://schema.org/encoding encoding} can be used to indicate each {@link https://schema.org/MediaObject MediaObject} alongside particular {@link https://schema.org/encodingFormat encodingFormat} information.
     *
     * Unregistered or niche encoding and file formats can be indicated instead via the most appropriate URL, e.g. defining Web page or a Wikipedia/Wikidata entry.
     */
    "encodingFormat"?: SchemaValue<Text | URL, "encodingFormat">;
    /**
     * A media object that encodes this CreativeWork.
     *
     * @deprecated Consider using https://schema.org/encoding instead.
     */
    "encodings"?: SchemaValue<MediaObject | IdReference, "encodings">;
    /** A creative work that this work is an example/instance/realization/derivation of. */
    "exampleOfWork"?: SchemaValue<CreativeWork | IdReference, "exampleOfWork">;
    /** Date the content expires and is no longer useful or available. For example a {@link https://schema.org/VideoObject VideoObject} or {@link https://schema.org/NewsArticle NewsArticle} whose availability or relevance is time-limited, a {@link https://schema.org/ClaimReview ClaimReview} fact check whose publisher wants to indicate that it may no longer be relevant (or helpful to highlight) after some date, or a {@link https://schema.org/Certification Certification} the validity has expired. */
    "expires"?: SchemaValue<Date | DateTime, "expires">;
    /**
     * Media type, typically MIME format (see {@link http://www.iana.org/assignments/media-types/media-types.xhtml IANA site}) of the content, e.g. application/zip of a SoftwareApplication binary. In cases where a CreativeWork has several media type representations, 'encoding' can be used to indicate each MediaObject alongside particular fileFormat information. Unregistered or niche file formats can be indicated instead via the most appropriate URL, e.g. defining Web page or a Wikipedia entry.
     *
     * @deprecated Consider using https://schema.org/encodingFormat instead.
     */
    "fileFormat"?: SchemaValue<Text | URL, "fileFormat">;
    /** A person or organization that supports (sponsors) something through some kind of financial contribution. */
    "funder"?: SchemaValue<Organization | Person | IdReference, "funder">;
    /** A {@link https://schema.org/Grant Grant} that directly or indirectly provide funding or sponsorship for this item. See also {@link https://schema.org/ownershipFundingInfo ownershipFundingInfo}. */
    "funding"?: SchemaValue<Grant | IdReference, "funding">;
    /** Genre of the creative work, broadcast channel or group. */
    "genre"?: SchemaValue<Text | URL, "genre">;
    /** Indicates an item or CreativeWork that is part of this item, or CreativeWork (in some sense). */
    "hasPart"?: SchemaValue<CreativeWork | IdReference, "hasPart">;
    /** Headline of the article. */
    "headline"?: SchemaValue<Text, "headline">;
    /** The language of the content or performance or used in an action. Please use one of the language codes from the {@link http://tools.ietf.org/html/bcp47 IETF BCP 47 standard}. See also {@link https://schema.org/availableLanguage availableLanguage}. */
    "inLanguage"?: SchemaValue<Language | Text | IdReference, "inLanguage">;
    /** The number of interactions for the CreativeWork using the WebSite or SoftwareApplication. The most specific child type of InteractionCounter should be used. */
    "interactionStatistic"?: SchemaValue<InteractionCounter | IdReference, "interactionStatistic">;
    /** The predominant mode of learning supported by the learning resource. Acceptable values are 'active', 'expositive', or 'mixed'. */
    "interactivityType"?: SchemaValue<Text, "interactivityType">;
    /** Used to indicate a specific claim contained, implied, translated or refined from the content of a {@link https://schema.org/MediaObject MediaObject} or other {@link https://schema.org/CreativeWork CreativeWork}. The interpreting party can be indicated using {@link https://schema.org/claimInterpreter claimInterpreter}. */
    "interpretedAsClaim"?: SchemaValue<Claim | IdReference, "interpretedAsClaim">;
    /** A flag to signal that the item, event, or place is accessible for free. */
    "isAccessibleForFree"?: SchemaValue<Boolean, "isAccessibleForFree">;
    /** A resource from which this work is derived or from which it is a modification or adaptation. */
    "isBasedOn"?: SchemaValue<CreativeWork | Product | URL | IdReference, "isBasedOn">;
    /**
     * A resource that was used in the creation of this resource. This term can be repeated for multiple sources. For example, http://example.com/great-multiplication-intro.html.
     *
     * @deprecated Consider using https://schema.org/isBasedOn instead.
     */
    "isBasedOnUrl"?: SchemaValue<CreativeWork | Product | URL | IdReference, "isBasedOnUrl">;
    /** Indicates whether this content is family friendly. */
    "isFamilyFriendly"?: SchemaValue<Boolean, "isFamilyFriendly">;
    /** Indicates an item or CreativeWork that this item, or CreativeWork (in some sense), is part of. */
    "isPartOf"?: SchemaValue<CreativeWork | URL | IdReference, "isPartOf">;
    /** Keywords or tags used to describe some item. Multiple textual entries in a keywords list are typically delimited by commas, or by repeating the property. */
    "keywords"?: SchemaValue<DefinedTerm | Text | URL | IdReference, "keywords">;
    /** The predominant type or kind characterizing the learning resource. For example, 'presentation', 'handout'. */
    "learningResourceType"?: SchemaValue<DefinedTerm | Text | IdReference, "learningResourceType">;
    /** A license document that applies to this content, typically indicated by URL. */
    "license"?: SchemaValue<CreativeWork | URL | IdReference, "license">;
    /** The location where the CreativeWork was created, which may not be the same as the location depicted in the CreativeWork. */
    "locationCreated"?: SchemaValue<Place | IdReference, "locationCreated">;
    /** Indicates the primary entity described in some page or other CreativeWork. */
    "mainEntity"?: SchemaValue<Thing | IdReference, "mainEntity">;
    /** A maintainer of a {@link https://schema.org/Dataset Dataset}, software package ({@link https://schema.org/SoftwareApplication SoftwareApplication}), or other {@link https://schema.org/Project Project}. A maintainer is a {@link https://schema.org/Person Person} or {@link https://schema.org/Organization Organization} that manages contributions to, and/or publication of, some (typically complex) artifact. It is common for distributions of software and data to be based on "upstream" sources. When {@link https://schema.org/maintainer maintainer} is applied to a specific version of something e.g. a particular version or packaging of a {@link https://schema.org/Dataset Dataset}, it is always possible that the upstream source has a different maintainer. The {@link https://schema.org/isBasedOn isBasedOn} property can be used to indicate such relationships between datasets to make the different maintenance roles clear. Similarly in the case of software, a package may have dedicated maintainers working on integration into software distributions such as Ubuntu, as well as upstream maintainers of the underlying work. */
    "maintainer"?: SchemaValue<Organization | Person | IdReference, "maintainer">;
    /** A material that something is made from, e.g. leather, wool, cotton, paper. */
    "material"?: SchemaValue<Product | Text | URL | IdReference, "material">;
    /** The quantity of the materials being described or an expression of the physical space they occupy. */
    "materialExtent"?: SchemaValue<QuantitativeValue | Text | IdReference, "materialExtent">;
    /** Indicates that the CreativeWork contains a reference to, but is not necessarily about a concept. */
    "mentions"?: SchemaValue<Thing | IdReference, "mentions">;
    /** An offer to provide this item—for example, an offer to sell a product, rent the DVD of a movie, perform a service, or give away tickets to an event. Use {@link https://schema.org/businessFunction businessFunction} to indicate the kind of transaction offered, i.e. sell, lease, etc. This property can also be used to describe a {@link https://schema.org/Demand Demand}. While this property is listed as expected on a number of common types, it can be used in others. In that case, using a second type, such as Product or a subtype of Product, can clarify the nature of the offer. */
    "offers"?: SchemaValue<Demand | Offer | IdReference, "offers">;
    /** A pattern that something has, for example 'polka dot', 'striped', 'Canadian flag'. Values are typically expressed as text, although links to controlled value schemes are also supported. */
    "pattern"?: SchemaValue<DefinedTerm | Text | IdReference, "pattern">;
    /** The position of an item in a series or sequence of items. */
    "position"?: SchemaValue<Integer | Text, "position">;
    /** The person or organization who produced the work (e.g. music album, movie, TV/radio series etc.). */
    "producer"?: SchemaValue<Organization | Person | IdReference, "producer">;
    /** The service provider, service operator, or service performer; the goods producer. Another party (a seller) may offer those services or goods on behalf of the provider. A provider may also serve as the seller. */
    "provider"?: SchemaValue<Organization | Person | IdReference, "provider">;
    /** A publication event associated with the item. */
    "publication"?: SchemaValue<PublicationEvent | IdReference, "publication">;
    /** The publisher of the creative work. */
    "publisher"?: SchemaValue<Organization | Person | IdReference, "publisher">;
    /** The publishing division which published the comic. */
    "publisherImprint"?: SchemaValue<Organization | IdReference, "publisherImprint">;
    /**
     * The publishingPrinciples property indicates (typically via {@link https://schema.org/URL URL}) a document describing the editorial principles of an {@link https://schema.org/Organization Organization} (or individual, e.g. a {@link https://schema.org/Person Person} writing a blog) that relate to their activities as a publisher, e.g. ethics or diversity policies. When applied to a {@link https://schema.org/CreativeWork CreativeWork} (e.g. {@link https://schema.org/NewsArticle NewsArticle}) the principles are those of the party primarily responsible for the creation of the {@link https://schema.org/CreativeWork CreativeWork}.
     *
     * While such policies are most typically expressed in natural language, sometimes related information (e.g. indicating a {@link https://schema.org/funder funder}) can be expressed using schema.org terminology.
     */
    "publishingPrinciples"?: SchemaValue<CreativeWork | URL | IdReference, "publishingPrinciples">;
    /** The Event where the CreativeWork was recorded. The CreativeWork may capture all or part of the event. */
    "recordedAt"?: SchemaValue<Event | IdReference, "recordedAt">;
    /** The place and time the release was issued, expressed as a PublicationEvent. */
    "releasedEvent"?: SchemaValue<PublicationEvent | IdReference, "releasedEvent">;
    /** A review of the item. */
    "review"?: SchemaValue<Review | IdReference, "review">;
    /**
     * Review of the item.
     *
     * @deprecated Consider using https://schema.org/review instead.
     */
    "reviews"?: SchemaValue<Review | IdReference, "reviews">;
    /** Indicates (by URL or string) a particular version of a schema used in some CreativeWork. This property was created primarily to indicate the use of a specific schema.org release, e.g. `10.0` as a simple string, or more explicitly via URL, `https://schema.org/docs/releases.html#v10.0`. There may be situations in which other schemas might usefully be referenced this way, e.g. `http://dublincore.org/specifications/dublin-core/dces/1999-07-02/` but this has not been carefully explored in the community. */
    "schemaVersion"?: SchemaValue<Text | URL, "schemaVersion">;
    /** Indicates the date on which the current structured data was generated / published. Typically used alongside {@link https://schema.org/sdPublisher sdPublisher}. */
    "sdDatePublished"?: SchemaValue<Date, "sdDatePublished">;
    /** A license document that applies to this structured data, typically indicated by URL. */
    "sdLicense"?: SchemaValue<CreativeWork | URL | IdReference, "sdLicense">;
    /** Indicates the party responsible for generating and publishing the current structured data markup, typically in cases where the structured data is derived automatically from existing published content but published on a different site. For example, student projects and open data initiatives often re-publish existing content with more explicitly structured metadata. The {@link https://schema.org/sdPublisher sdPublisher} property helps make such practices more explicit. */
    "sdPublisher"?: SchemaValue<Organization | Person | IdReference, "sdPublisher">;
    /** A standardized size of a product or creative work, specified either through a simple textual string (for example 'XL', '32Wx34L'), a QuantitativeValue with a unitCode, or a comprehensive and structured {@link https://schema.org/SizeSpecification SizeSpecification}; in other cases, the {@link https://schema.org/width width}, {@link https://schema.org/height height}, {@link https://schema.org/depth depth} and {@link https://schema.org/weight weight} properties may be more applicable. */
    "size"?: SchemaValue<DefinedTerm | QuantitativeValue | SizeSpecification | Text | IdReference, "size">;
    /** The Organization on whose behalf the creator was working. */
    "sourceOrganization"?: SchemaValue<Organization | IdReference, "sourceOrganization">;
    /** The "spatial" property can be used in cases when more specific properties (e.g. {@link https://schema.org/locationCreated locationCreated}, {@link https://schema.org/spatialCoverage spatialCoverage}, {@link https://schema.org/contentLocation contentLocation}) are not known to be appropriate. */
    "spatial"?: SchemaValue<Place | IdReference, "spatial">;
    /** The spatialCoverage of a CreativeWork indicates the place(s) which are the focus of the content. It is a subproperty of contentLocation intended primarily for more technical and detailed materials. For example with a Dataset, it indicates areas that the dataset describes: a dataset of New York weather would have spatialCoverage which was the place: the state of New York. */
    "spatialCoverage"?: SchemaValue<Place | IdReference, "spatialCoverage">;
    /** A person or organization that supports a thing through a pledge, promise, or financial contribution. E.g. a sponsor of a Medical Study or a corporate sponsor of an event. */
    "sponsor"?: SchemaValue<Organization | Person | IdReference, "sponsor">;
    /** The item being described is intended to help a person learn the competency or learning outcome defined by the referenced term. */
    "teaches"?: SchemaValue<DefinedTerm | Text | IdReference, "teaches">;
    /** The "temporal" property can be used in cases where more specific properties (e.g. {@link https://schema.org/temporalCoverage temporalCoverage}, {@link https://schema.org/dateCreated dateCreated}, {@link https://schema.org/dateModified dateModified}, {@link https://schema.org/datePublished datePublished}) are not known to be appropriate. */
    "temporal"?: SchemaValue<DateTime | Text, "temporal">;
    /**
     * The temporalCoverage of a CreativeWork indicates the period that the content applies to, i.e. that it describes, either as a DateTime or as a textual string indicating a time period in {@link https://en.wikipedia.org/wiki/ISO_8601#Time_intervals ISO 8601 time interval format}. In the case of a Dataset it will typically indicate the relevant time period in a precise notation (e.g. for a 2011 census dataset, the year 2011 would be written "2011/2012"). Other forms of content, e.g. ScholarlyArticle, Book, TVSeries or TVEpisode, may indicate their temporalCoverage in broader terms - textually or via well-known URL. Written works such as books may sometimes have precise temporal coverage too, e.g. a work set in 1939 - 1945 can be indicated in ISO 8601 interval format format via "1939/1945".
     *
     * Open-ended date ranges can be written with ".." in place of the end date. For example, "2015-11/.." indicates a range beginning in November 2015 and with no specified final date. This is tentative and might be updated in future when ISO 8601 is officially updated.
     */
    "temporalCoverage"?: SchemaValue<DateTime | Text | URL, "temporalCoverage">;
    /** The textual content of this CreativeWork. */
    "text"?: SchemaValue<Text, "text">;
    /** Thumbnail image for an image or video. */
    "thumbnail"?: SchemaValue<ImageObject | IdReference, "thumbnail">;
    /** A thumbnail image relevant to the Thing. */
    "thumbnailUrl"?: SchemaValue<URL, "thumbnailUrl">;
    /** Approximate or typical time it usually takes to work with or through the content of this work for the typical or target audience. */
    "timeRequired"?: SchemaValue<Duration | IdReference, "timeRequired">;
    /** The work that this work has been translated from. E.g. 物种起源 is a translationOf “On the Origin of Species”. */
    "translationOfWork"?: SchemaValue<CreativeWork | IdReference, "translationOfWork">;
    /** Organization or person who adapts a creative work to different languages, regional differences and technical requirements of a target market, or that translates during some event. */
    "translator"?: SchemaValue<Organization | Person | IdReference, "translator">;
    /** The typical expected age range, e.g. '7-9', '11-'. */
    "typicalAgeRange"?: SchemaValue<Text, "typicalAgeRange">;
    /**
     * The schema.org {@link https://schema.org/usageInfo usageInfo} property indicates further information about a {@link https://schema.org/CreativeWork CreativeWork}. This property is applicable both to works that are freely available and to those that require payment or other transactions. It can reference additional information, e.g. community expectations on preferred linking and citation conventions, as well as purchasing details. For something that can be commercially licensed, usageInfo can provide detailed, resource-specific information about licensing options.
     *
     * This property can be used alongside the license property which indicates license(s) applicable to some piece of content. The usageInfo property can provide information about other licensing options, e.g. acquiring commercial usage rights for an image that is also available under non-commercial creative commons licenses.
     */
    "usageInfo"?: SchemaValue<CreativeWork | URL | IdReference, "usageInfo">;
    /** The version of the CreativeWork embodied by a specified resource. */
    "version"?: SchemaValue<Number | Text, "version">;
    /** An embedded video object. */
    "video"?: SchemaValue<Clip | VideoObject | IdReference, "video">;
    /** Example/instance/realization/derivation of the concept of this creative work. E.g. the paperback edition, first edition, or e-book. */
    "workExample"?: SchemaValue<CreativeWork | IdReference, "workExample">;
    /** A work that is a translation of the content of this work. E.g. 西遊記 has an English workTranslation “Journey to the West”, a German workTranslation “Monkeys Pilgerfahrt” and a Vietnamese translation Tây du ký bình khảo. */
    "workTranslation"?: SchemaValue<CreativeWork | IdReference, "workTranslation">;
}
interface CreativeWorkLeaf extends CreativeWorkBase {
    "@type": "CreativeWork";
}
/** The most generic kind of creative work, including books, movies, photographs, software programs, etc. */
export type CreativeWork = CreativeWorkLeaf | AmpStory | ArchiveComponent | Article | Atlas | Blog | Book | Certification | Chapter | Claim | Clip | Code | Collection | ComicStory | Comment | Conversation | Course | CreativeWorkSeason | CreativeWorkSeries | DataCatalog | Dataset | DefinedTermSet | Diet | DigitalDocument | Drawing | EducationalOccupationalCredential | Episode | ExercisePlan | Game | Guide | HowTo | HowToDirection | HowToSection | HowToStep | HowToTip | HyperToc | HyperTocEntry | LearningResource | Legislation | Manuscript | Map | MathSolver | MediaObject | MediaReviewItem | Menu | MenuSection | Message | Movie | MusicComposition | MusicPlaylist | MusicRecording | Painting | Photograph | Play | Poster | PublicationIssue | PublicationVolume | Quotation | Review | Sculpture | Season | SheetMusic | ShortStory | SoftwareApplication | SoftwareSourceCode | SpecialAnnouncement | Statement | Thesis | TVSeason | TVSeries | VisualArtwork | WebContent | WebPage | WebPageElement | WebSite;
interface CreativeWorkSeasonBase extends CreativeWorkBase {
    /** An actor (individual or a group), e.g. in TV, radio, movie, video games etc., or in an event. Actors can be associated with individual items or with a series, episode, clip. */
    "actor"?: SchemaValue<PerformingGroup | Person | IdReference, "actor">;
    /** A director of e.g. TV, radio, movie, video gaming etc. content, or of an event. Directors can be associated with individual items or with a series, episode, clip. */
    "director"?: SchemaValue<Person | IdReference, "director">;
    /** The end date and time of the item (in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 date format}). */
    "endDate"?: SchemaValue<Date | DateTime, "endDate">;
    /** An episode of a TV, radio or game media within a series or season. */
    "episode"?: SchemaValue<Episode | IdReference, "episode">;
    /**
     * An episode of a TV/radio series or season.
     *
     * @deprecated Consider using https://schema.org/episode instead.
     */
    "episodes"?: SchemaValue<Episode | IdReference, "episodes">;
    /** The number of episodes in this season or series. */
    "numberOfEpisodes"?: SchemaValue<Integer, "numberOfEpisodes">;
    /** The series to which this episode or season belongs. */
    "partOfSeries"?: SchemaValue<CreativeWorkSeries | IdReference, "partOfSeries">;
    /** The production company or studio responsible for the item, e.g. series, video game, episode etc. */
    "productionCompany"?: SchemaValue<Organization | IdReference, "productionCompany">;
    /** Position of the season within an ordered group of seasons. */
    "seasonNumber"?: SchemaValue<Integer | Text, "seasonNumber">;
    /** The start date and time of the item (in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 date format}). */
    "startDate"?: SchemaValue<Date | DateTime, "startDate">;
    /** The trailer of a movie or TV/radio series, season, episode, etc. */
    "trailer"?: SchemaValue<VideoObject | IdReference, "trailer">;
}
interface CreativeWorkSeasonLeaf extends CreativeWorkSeasonBase {
    "@type": "CreativeWorkSeason";
}
/** A media season, e.g. TV, radio, video game etc. */
export type CreativeWorkSeason = CreativeWorkSeasonLeaf | PodcastSeason | RadioSeason | TVSeason;
interface CreativeWorkSeriesBase extends CreativeWorkBase, ThingBase {
    /** The end date and time of the item (in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 date format}). */
    "endDate"?: SchemaValue<Date | DateTime, "endDate">;
    /** The International Standard Serial Number (ISSN) that identifies this serial publication. You can repeat this property to identify different formats of, or the linking ISSN (ISSN-L) for, this serial publication. */
    "issn"?: SchemaValue<Text, "issn">;
    /** The start date and time of the item (in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 date format}). */
    "startDate"?: SchemaValue<Date | DateTime, "startDate">;
}
interface CreativeWorkSeriesLeaf extends CreativeWorkSeriesBase {
    "@type": "CreativeWorkSeries";
}
/**
 * A CreativeWorkSeries in schema.org is a group of related items, typically but not necessarily of the same kind. CreativeWorkSeries are usually organized into some order, often chronological. Unlike {@link https://schema.org/ItemList ItemList} which is a general purpose data structure for lists of things, the emphasis with CreativeWorkSeries is on published materials (written e.g. books and periodicals, or media such as TV, radio and games).
 *
 * Specific subtypes are available for describing {@link https://schema.org/TVSeries TVSeries}, {@link https://schema.org/RadioSeries RadioSeries}, {@link https://schema.org/MovieSeries MovieSeries}, {@link https://schema.org/BookSeries BookSeries}, {@link https://schema.org/Periodical Periodical} and {@link https://schema.org/VideoGameSeries VideoGameSeries}. In each case, the {@link https://schema.org/hasPart hasPart} / {@link https://schema.org/isPartOf isPartOf} properties can be used to relate the CreativeWorkSeries to its parts. The general CreativeWorkSeries type serves largely just to organize these more specific and practical subtypes.
 *
 * It is common for properties applicable to an item from the series to be usefully applied to the containing group. Schema.org attempts to anticipate some of these cases, but publishers should be free to apply properties of the series parts to the series as a whole wherever they seem appropriate.
 */
export type CreativeWorkSeries = CreativeWorkSeriesLeaf | BookSeries | MovieSeries | Periodical | PodcastSeries | RadioSeries | TVSeries | VideoGameSeries;
interface CreditCardBase extends LoanOrCreditBase, PaymentCardBase {
}
interface CreditCardLeaf extends CreditCardBase {
    "@type": "CreditCard";
}
/**
 * A card payment method of a particular brand or name. Used to mark up a particular payment method and/or the financial product/service that supplies the card account.
 *
 * Commonly used values:
 * - http://purl.org/goodrelations/v1#AmericanExpress
 * - http://purl.org/goodrelations/v1#DinersClub
 * - http://purl.org/goodrelations/v1#Discover
 * - http://purl.org/goodrelations/v1#JCB
 * - http://purl.org/goodrelations/v1#MasterCard
 * - http://purl.org/goodrelations/v1#VISA
 */
export type CreditCard = CreditCardLeaf;
interface CrematoriumLeaf extends CivicStructureBase {
    "@type": "Crematorium";
}
/** A crematorium. */
export type Crematorium = CrematoriumLeaf | string;
interface CriticReviewLeaf extends ReviewBase {
    "@type": "CriticReview";
}
/** A {@link https://schema.org/CriticReview CriticReview} is a more specialized form of Review written or published by a source that is recognized for its reviewing activities. These can include online columns, travel and food guides, TV and radio shows, blogs and other independent Web sites. {@link https://schema.org/CriticReview CriticReview}s are typically more in-depth and professionally written. For simpler, casually written user/visitor/viewer/customer reviews, it is more appropriate to use the {@link https://schema.org/UserReview UserReview} type. Review aggregator sites such as Metacritic already separate out the site's user reviews from selected critic reviews that originate from third-party sources. */
export type CriticReview = CriticReviewLeaf | ReviewNewsArticle;
/** Text representing a CSS selector. */
export type CssSelectorType = string;
interface CurrencyConversionServiceLeaf extends FinancialProductBase {
    "@type": "CurrencyConversionService";
}
/** A service to convert funds from one currency to another currency. */
export type CurrencyConversionService = CurrencyConversionServiceLeaf;
interface DanceEventLeaf extends EventBase {
    "@type": "DanceEvent";
}
/** Event type: A social dance. */
export type DanceEvent = DanceEventLeaf;
interface DanceGroupLeaf extends OrganizationBase {
    "@type": "DanceGroup";
}
/** A dance group—for example, the Alvin Ailey Dance Theater or Riverdance. */
export type DanceGroup = DanceGroupLeaf | string;
interface DataCatalogBase extends CreativeWorkBase {
    /** A dataset contained in this catalog. */
    "dataset"?: SchemaValue<Dataset | IdReference, "dataset">;
    /** A subproperty of {@link https://schema.org/measurementTechnique measurementTechnique} that can be used for specifying specific methods, in particular via {@link https://schema.org/MeasurementMethodEnum MeasurementMethodEnum}. */
    "measurementMethod"?: SchemaValue<DefinedTerm | MeasurementMethodEnum | Text | URL | IdReference, "measurementMethod">;
    /**
     * A technique, method or technology used in an {@link https://schema.org/Observation Observation}, {@link https://schema.org/StatisticalVariable StatisticalVariable} or {@link https://schema.org/Dataset Dataset} (or {@link https://schema.org/DataDownload DataDownload}, {@link https://schema.org/DataCatalog DataCatalog}), corresponding to the method used for measuring the corresponding variable(s) (for datasets, described using {@link https://schema.org/variableMeasured variableMeasured}; for {@link https://schema.org/Observation Observation}, a {@link https://schema.org/StatisticalVariable StatisticalVariable}). Often but not necessarily each {@link https://schema.org/variableMeasured variableMeasured} will have an explicit representation as (or mapping to) an property such as those defined in Schema.org, or other RDF vocabularies and "knowledge graphs". In that case the subproperty of {@link https://schema.org/variableMeasured variableMeasured} called {@link https://schema.org/measuredProperty measuredProperty} is applicable.
     *
     * The {@link https://schema.org/measurementTechnique measurementTechnique} property helps when extra clarification is needed about how a {@link https://schema.org/measuredProperty measuredProperty} was measured. This is oriented towards scientific and scholarly dataset publication but may have broader applicability; it is not intended as a full representation of measurement, but can often serve as a high level summary for dataset discovery.
     *
     * For example, if {@link https://schema.org/variableMeasured variableMeasured} is: molecule concentration, {@link https://schema.org/measurementTechnique measurementTechnique} could be: "mass spectrometry" or "nmr spectroscopy" or "colorimetry" or "immunofluorescence". If the {@link https://schema.org/variableMeasured variableMeasured} is "depression rating", the {@link https://schema.org/measurementTechnique measurementTechnique} could be "Zung Scale" or "HAM-D" or "Beck Depression Inventory".
     *
     * If there are several {@link https://schema.org/variableMeasured variableMeasured} properties recorded for some given data object, use a {@link https://schema.org/PropertyValue PropertyValue} for each {@link https://schema.org/variableMeasured variableMeasured} and attach the corresponding {@link https://schema.org/measurementTechnique measurementTechnique}. The value can also be from an enumeration, organized as a {@link https://schema.org/MeasurementMetholdEnumeration MeasurementMetholdEnumeration}.
     */
    "measurementTechnique"?: SchemaValue<DefinedTerm | MeasurementMethodEnum | Text | URL | IdReference, "measurementTechnique">;
}
interface DataCatalogLeaf extends DataCatalogBase {
    "@type": "DataCatalog";
}
/** A collection of datasets. */
export type DataCatalog = DataCatalogLeaf;
interface DataDownloadBase extends MediaObjectBase {
    /** A subproperty of {@link https://schema.org/measurementTechnique measurementTechnique} that can be used for specifying specific methods, in particular via {@link https://schema.org/MeasurementMethodEnum MeasurementMethodEnum}. */
    "measurementMethod"?: SchemaValue<DefinedTerm | MeasurementMethodEnum | Text | URL | IdReference, "measurementMethod">;
    /**
     * A technique, method or technology used in an {@link https://schema.org/Observation Observation}, {@link https://schema.org/StatisticalVariable StatisticalVariable} or {@link https://schema.org/Dataset Dataset} (or {@link https://schema.org/DataDownload DataDownload}, {@link https://schema.org/DataCatalog DataCatalog}), corresponding to the method used for measuring the corresponding variable(s) (for datasets, described using {@link https://schema.org/variableMeasured variableMeasured}; for {@link https://schema.org/Observation Observation}, a {@link https://schema.org/StatisticalVariable StatisticalVariable}). Often but not necessarily each {@link https://schema.org/variableMeasured variableMeasured} will have an explicit representation as (or mapping to) an property such as those defined in Schema.org, or other RDF vocabularies and "knowledge graphs". In that case the subproperty of {@link https://schema.org/variableMeasured variableMeasured} called {@link https://schema.org/measuredProperty measuredProperty} is applicable.
     *
     * The {@link https://schema.org/measurementTechnique measurementTechnique} property helps when extra clarification is needed about how a {@link https://schema.org/measuredProperty measuredProperty} was measured. This is oriented towards scientific and scholarly dataset publication but may have broader applicability; it is not intended as a full representation of measurement, but can often serve as a high level summary for dataset discovery.
     *
     * For example, if {@link https://schema.org/variableMeasured variableMeasured} is: molecule concentration, {@link https://schema.org/measurementTechnique measurementTechnique} could be: "mass spectrometry" or "nmr spectroscopy" or "colorimetry" or "immunofluorescence". If the {@link https://schema.org/variableMeasured variableMeasured} is "depression rating", the {@link https://schema.org/measurementTechnique measurementTechnique} could be "Zung Scale" or "HAM-D" or "Beck Depression Inventory".
     *
     * If there are several {@link https://schema.org/variableMeasured variableMeasured} properties recorded for some given data object, use a {@link https://schema.org/PropertyValue PropertyValue} for each {@link https://schema.org/variableMeasured variableMeasured} and attach the corresponding {@link https://schema.org/measurementTechnique measurementTechnique}. The value can also be from an enumeration, organized as a {@link https://schema.org/MeasurementMetholdEnumeration MeasurementMetholdEnumeration}.
     */
    "measurementTechnique"?: SchemaValue<DefinedTerm | MeasurementMethodEnum | Text | URL | IdReference, "measurementTechnique">;
}
interface DataDownloadLeaf extends DataDownloadBase {
    "@type": "DataDownload";
}
/** All or part of a {@link https://schema.org/Dataset Dataset} in downloadable form. */
export type DataDownload = DataDownloadLeaf;
interface DataFeedBase extends DatasetBase {
    /** An item within a data feed. Data feeds may have many elements. */
    "dataFeedElement"?: SchemaValue<DataFeedItem | Text | Thing | IdReference, "dataFeedElement">;
}
interface DataFeedLeaf extends DataFeedBase {
    "@type": "DataFeed";
}
/** A single feed providing structured information about one or more entities or topics. */
export type DataFeed = DataFeedLeaf | CompleteDataFeed;
interface DataFeedItemBase extends ThingBase {
    /** The date on which the CreativeWork was created or the item was added to a DataFeed. */
    "dateCreated"?: SchemaValue<Date | DateTime, "dateCreated">;
    /** The datetime the item was removed from the DataFeed. */
    "dateDeleted"?: SchemaValue<Date | DateTime, "dateDeleted">;
    /** The date on which the CreativeWork was most recently modified or when the item's entry was modified within a DataFeed. */
    "dateModified"?: SchemaValue<Date | DateTime, "dateModified">;
    /** An entity represented by an entry in a list or data feed (e.g. an 'artist' in a list of 'artists'). */
    "item"?: SchemaValue<Thing | IdReference, "item">;
}
interface DataFeedItemLeaf extends DataFeedItemBase {
    "@type": "DataFeedItem";
}
/** A single item within a larger data feed. */
export type DataFeedItem = DataFeedItemLeaf;
interface DatasetBase extends CreativeWorkBase {
    /**
     * A data catalog which contains this dataset.
     *
     * @deprecated Consider using https://schema.org/includedInDataCatalog instead.
     */
    "catalog"?: SchemaValue<DataCatalog | IdReference, "catalog">;
    /**
     * The range of temporal applicability of a dataset, e.g. for a 2011 census dataset, the year 2011 (in ISO 8601 time interval format).
     *
     * @deprecated Consider using https://schema.org/temporalCoverage instead.
     */
    "datasetTimeInterval"?: SchemaValue<DateTime, "datasetTimeInterval">;
    /** A downloadable form of this dataset, at a specific location, in a specific format. This property can be repeated if different variations are available. There is no expectation that different downloadable distributions must contain exactly equivalent information (see also {@link https://www.w3.org/TR/vocab-dcat-3/#Class:Distribution DCAT} on this point). Different distributions might include or exclude different subsets of the entire dataset, for example. */
    "distribution"?: SchemaValue<DataDownload | IdReference, "distribution">;
    /**
     * A data catalog which contains this dataset (this property was previously 'catalog', preferred name is now 'includedInDataCatalog').
     *
     * @deprecated Consider using https://schema.org/includedInDataCatalog instead.
     */
    "includedDataCatalog"?: SchemaValue<DataCatalog | IdReference, "includedDataCatalog">;
    /** A data catalog which contains this dataset. */
    "includedInDataCatalog"?: SchemaValue<DataCatalog | IdReference, "includedInDataCatalog">;
    /** The International Standard Serial Number (ISSN) that identifies this serial publication. You can repeat this property to identify different formats of, or the linking ISSN (ISSN-L) for, this serial publication. */
    "issn"?: SchemaValue<Text, "issn">;
    /** A subproperty of {@link https://schema.org/measurementTechnique measurementTechnique} that can be used for specifying specific methods, in particular via {@link https://schema.org/MeasurementMethodEnum MeasurementMethodEnum}. */
    "measurementMethod"?: SchemaValue<DefinedTerm | MeasurementMethodEnum | Text | URL | IdReference, "measurementMethod">;
    /**
     * A technique, method or technology used in an {@link https://schema.org/Observation Observation}, {@link https://schema.org/StatisticalVariable StatisticalVariable} or {@link https://schema.org/Dataset Dataset} (or {@link https://schema.org/DataDownload DataDownload}, {@link https://schema.org/DataCatalog DataCatalog}), corresponding to the method used for measuring the corresponding variable(s) (for datasets, described using {@link https://schema.org/variableMeasured variableMeasured}; for {@link https://schema.org/Observation Observation}, a {@link https://schema.org/StatisticalVariable StatisticalVariable}). Often but not necessarily each {@link https://schema.org/variableMeasured variableMeasured} will have an explicit representation as (or mapping to) an property such as those defined in Schema.org, or other RDF vocabularies and "knowledge graphs". In that case the subproperty of {@link https://schema.org/variableMeasured variableMeasured} called {@link https://schema.org/measuredProperty measuredProperty} is applicable.
     *
     * The {@link https://schema.org/measurementTechnique measurementTechnique} property helps when extra clarification is needed about how a {@link https://schema.org/measuredProperty measuredProperty} was measured. This is oriented towards scientific and scholarly dataset publication but may have broader applicability; it is not intended as a full representation of measurement, but can often serve as a high level summary for dataset discovery.
     *
     * For example, if {@link https://schema.org/variableMeasured variableMeasured} is: molecule concentration, {@link https://schema.org/measurementTechnique measurementTechnique} could be: "mass spectrometry" or "nmr spectroscopy" or "colorimetry" or "immunofluorescence". If the {@link https://schema.org/variableMeasured variableMeasured} is "depression rating", the {@link https://schema.org/measurementTechnique measurementTechnique} could be "Zung Scale" or "HAM-D" or "Beck Depression Inventory".
     *
     * If there are several {@link https://schema.org/variableMeasured variableMeasured} properties recorded for some given data object, use a {@link https://schema.org/PropertyValue PropertyValue} for each {@link https://schema.org/variableMeasured variableMeasured} and attach the corresponding {@link https://schema.org/measurementTechnique measurementTechnique}. The value can also be from an enumeration, organized as a {@link https://schema.org/MeasurementMetholdEnumeration MeasurementMetholdEnumeration}.
     */
    "measurementTechnique"?: SchemaValue<DefinedTerm | MeasurementMethodEnum | Text | URL | IdReference, "measurementTechnique">;
    /** The variableMeasured property can indicate (repeated as necessary) the variables that are measured in some dataset, either described as text or as pairs of identifier and description using PropertyValue, or more explicitly as a {@link https://schema.org/StatisticalVariable StatisticalVariable}. */
    "variableMeasured"?: SchemaValue<Property | PropertyValue | StatisticalVariable | Text | IdReference, "variableMeasured">;
    /** Originally named {@link https://schema.org/variablesMeasured variablesMeasured}, the {@link https://schema.org/variableMeasured variableMeasured} property can indicate (repeated as necessary) the variables that are measured in some dataset, either described as text or as pairs of identifier and description using PropertyValue. */
    "variablesMeasured"?: SchemaValue<PropertyValue | Text | IdReference, "variablesMeasured">;
}
interface DatasetLeaf extends DatasetBase {
    "@type": "Dataset";
}
/** A body of structured information describing some topic(s) of interest. */
export type Dataset = DatasetLeaf | DataFeed;
interface DatedMoneySpecificationBase extends ThingBase {
    /** The amount of money. */
    "amount"?: SchemaValue<MonetaryAmount | Number | IdReference, "amount">;
    /**
     * The currency in which the monetary amount is expressed.
     *
     * Use standard formats: {@link http://en.wikipedia.org/wiki/ISO_4217 ISO 4217 currency format}, e.g. "USD"; {@link https://en.wikipedia.org/wiki/List_of_cryptocurrencies Ticker symbol} for cryptocurrencies, e.g. "BTC"; well known names for {@link https://en.wikipedia.org/wiki/Local_exchange_trading_system Local Exchange Trading Systems} (LETS) and other currency types, e.g. "Ithaca HOUR".
     */
    "currency"?: SchemaValue<Text, "currency">;
    /** The end date and time of the item (in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 date format}). */
    "endDate"?: SchemaValue<Date | DateTime, "endDate">;
    /** The start date and time of the item (in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 date format}). */
    "startDate"?: SchemaValue<Date | DateTime, "startDate">;
}
interface DatedMoneySpecificationLeaf extends DatedMoneySpecificationBase {
    "@type": "DatedMoneySpecification";
}
/**
 * A DatedMoneySpecification represents monetary values with optional start and end dates. For example, this could represent an employee's salary over a specific period of time. __Note:__ This type has been superseded by {@link https://schema.org/MonetaryAmount MonetaryAmount}, use of that type is recommended.
 *
 * @deprecated Use MonetaryAmount instead.
 */
export type DatedMoneySpecification = DatedMoneySpecificationLeaf;
interface DayOfWeekLeaf extends EnumerationBase {
    "@type": "DayOfWeek";
}
/**
 * The day of the week, e.g. used to specify to which day the opening hours of an OpeningHoursSpecification refer.
 *
 * Originally, URLs from {@link http://purl.org/goodrelations/v1 GoodRelations} were used (for {@link https://schema.org/Monday Monday}, {@link https://schema.org/Tuesday Tuesday}, {@link https://schema.org/Wednesday Wednesday}, {@link https://schema.org/Thursday Thursday}, {@link https://schema.org/Friday Friday}, {@link https://schema.org/Saturday Saturday}, {@link https://schema.org/Sunday Sunday} plus a special entry for {@link https://schema.org/PublicHolidays PublicHolidays}); these have now been integrated directly into schema.org.
 */
export type DayOfWeek = "https://schema.org/Friday" | "Friday" | "https://schema.org/Monday" | "Monday" | "https://schema.org/PublicHolidays" | "PublicHolidays" | "https://schema.org/Saturday" | "Saturday" | "https://schema.org/Sunday" | "Sunday" | "https://schema.org/Thursday" | "Thursday" | "https://schema.org/Tuesday" | "Tuesday" | "https://schema.org/Wednesday" | "Wednesday" | DayOfWeekLeaf;
interface DaySpaLeaf extends LocalBusinessBase {
    "@type": "DaySpa";
}
/** A day spa. */
export type DaySpa = DaySpaLeaf | string;
interface DDxElementBase extends MedicalEntityBase {
    /** One or more alternative conditions considered in the differential diagnosis process as output of a diagnosis process. */
    "diagnosis"?: SchemaValue<MedicalCondition | IdReference, "diagnosis">;
    /** One of a set of signs and symptoms that can be used to distinguish this diagnosis from others in the differential diagnosis. */
    "distinguishingSign"?: SchemaValue<MedicalSignOrSymptom | IdReference, "distinguishingSign">;
}
interface DDxElementLeaf extends DDxElementBase {
    "@type": "DDxElement";
}
/** An alternative, closely-related condition typically considered later in the differential diagnosis process along with the signs that are used to distinguish it. */
export type DDxElement = DDxElementLeaf;
interface DeactivateActionLeaf extends ActionBase {
    "@type": "DeactivateAction";
}
/** The act of stopping or deactivating a device or application (e.g. stopping a timer or turning off a flashlight). */
export type DeactivateAction = DeactivateActionLeaf;
interface DefenceEstablishmentLeaf extends CivicStructureBase {
    "@type": "DefenceEstablishment";
}
/** A defence establishment, such as an army or navy base. */
export type DefenceEstablishment = DefenceEstablishmentLeaf | string;
interface DefinedRegionBase extends ThingBase {
    /** The country. Recommended to be in 2-letter {@link http://en.wikipedia.org/wiki/ISO_3166-1 ISO 3166-1 alpha-2} format, for example "US". For backward compatibility, a 3-letter {@link https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3 ISO 3166-1 alpha-3} country code such as "SGP" or a full country name such as "Singapore" can also be used. */
    "addressCountry"?: SchemaValue<Country | Text | IdReference, "addressCountry">;
    /** The region in which the locality is, and which is in the country. For example, California or another appropriate first-level {@link https://en.wikipedia.org/wiki/List_of_administrative_divisions_by_country Administrative division}. */
    "addressRegion"?: SchemaValue<Text, "addressRegion">;
    /** The postal code. For example, 94043. */
    "postalCode"?: SchemaValue<Text, "postalCode">;
    /** A defined range of postal codes indicated by a common textual prefix. Used for non-numeric systems such as UK. */
    "postalCodePrefix"?: SchemaValue<Text, "postalCodePrefix">;
    /** A defined range of postal codes. */
    "postalCodeRange"?: SchemaValue<PostalCodeRangeSpecification | IdReference, "postalCodeRange">;
}
interface DefinedRegionLeaf extends DefinedRegionBase {
    "@type": "DefinedRegion";
}
/**
 * A DefinedRegion is a geographic area defined by potentially arbitrary (rather than political, administrative or natural geographical) criteria. Properties are provided for defining a region by reference to sets of postal codes.
 *
 * Examples: a delivery destination when shopping. Region where regional pricing is configured.
 *
 * Requirement 1: Country: US States: "NY", "CA"
 *
 * Requirement 2: Country: US PostalCode Set: { [94000-94585], [97000, 97999], [13000, 13599]} { [12345, 12345], [78945, 78945], } Region = state, canton, prefecture, autonomous community...
 */
export type DefinedRegion = DefinedRegionLeaf;
interface DefinedTermBase extends ThingBase {
    /** A {@link https://schema.org/DefinedTermSet DefinedTermSet} that contains this term. */
    "inDefinedTermSet"?: SchemaValue<DefinedTermSet | URL | IdReference, "inDefinedTermSet">;
    /** A code that identifies this {@link https://schema.org/DefinedTerm DefinedTerm} within a {@link https://schema.org/DefinedTermSet DefinedTermSet}. */
    "termCode"?: SchemaValue<Text, "termCode">;
}
interface DefinedTermLeaf extends DefinedTermBase {
    "@type": "DefinedTerm";
}
/** A word, name, acronym, phrase, etc. with a formal definition. Often used in the context of category or subject classification, glossaries or dictionaries, product or creative work types, etc. Use the name property for the term being defined, use termCode if the term has an alpha-numeric code allocated, use description to provide the definition of the term. */
export type DefinedTerm = DefinedTermLeaf | CategoryCode;
interface DefinedTermSetBase extends CreativeWorkBase {
    /** A Defined Term contained in this term set. */
    "hasDefinedTerm"?: SchemaValue<DefinedTerm | IdReference, "hasDefinedTerm">;
}
interface DefinedTermSetLeaf extends DefinedTermSetBase {
    "@type": "DefinedTermSet";
}
/** A set of defined terms, for example a set of categories or a classification scheme, a glossary, dictionary or enumeration. */
export type DefinedTermSet = DefinedTermSetLeaf | CategoryCodeSet;
interface DeleteActionLeaf extends UpdateActionBase {
    "@type": "DeleteAction";
}
/** The act of editing a recipient by removing one of its objects. */
export type DeleteAction = DeleteActionLeaf;
interface DeliveryChargeSpecificationBase extends PriceSpecificationBase {
    /** The delivery method(s) to which the delivery charge or payment charge specification applies. */
    "appliesToDeliveryMethod"?: SchemaValue<DeliveryMethod | IdReference, "appliesToDeliveryMethod">;
    /** The geographic area where a service or offered item is provided. */
    "areaServed"?: SchemaValue<AdministrativeArea | GeoShape | Place | Text | IdReference, "areaServed">;
    /**
     * The ISO 3166-1 (ISO 3166-1 alpha-2) or ISO 3166-2 code, the place, or the GeoShape for the geo-political region(s) for which the offer or delivery charge specification is valid.
     *
     * See also {@link https://schema.org/ineligibleRegion ineligibleRegion}.
     */
    "eligibleRegion"?: SchemaValue<GeoShape | Place | Text | IdReference, "eligibleRegion">;
    /**
     * The ISO 3166-1 (ISO 3166-1 alpha-2) or ISO 3166-2 code, the place, or the GeoShape for the geo-political region(s) for which the offer or delivery charge specification is not valid, e.g. a region where the transaction is not allowed.
     *
     * See also {@link https://schema.org/eligibleRegion eligibleRegion}.
     */
    "ineligibleRegion"?: SchemaValue<GeoShape | Place | Text | IdReference, "ineligibleRegion">;
}
interface DeliveryChargeSpecificationLeaf extends DeliveryChargeSpecificationBase {
    "@type": "DeliveryChargeSpecification";
}
/** The price for the delivery of an offer using a particular delivery method. */
export type DeliveryChargeSpecification = DeliveryChargeSpecificationLeaf;
interface DeliveryEventBase extends EventBase {
    /** Password, PIN, or access code needed for delivery (e.g. from a locker). */
    "accessCode"?: SchemaValue<Text, "accessCode">;
    /** When the item is available for pickup from the store, locker, etc. */
    "availableFrom"?: SchemaValue<DateTime, "availableFrom">;
    /** After this date, the item will no longer be available for pickup. */
    "availableThrough"?: SchemaValue<DateTime, "availableThrough">;
    /** Method used for delivery or shipping. */
    "hasDeliveryMethod"?: SchemaValue<DeliveryMethod | IdReference, "hasDeliveryMethod">;
}
interface DeliveryEventLeaf extends DeliveryEventBase {
    "@type": "DeliveryEvent";
}
/** An event involving the delivery of an item. */
export type DeliveryEvent = DeliveryEventLeaf;
interface DeliveryMethodLeaf extends EnumerationBase {
    "@type": "DeliveryMethod";
}
/**
 * A delivery method is a standardized procedure for transferring the product or service to the destination of fulfillment chosen by the customer. Delivery methods are characterized by the means of transportation used, and by the organization or group that is the contracting party for the sending organization or person.
 *
 * Commonly used values:
 * - http://purl.org/goodrelations/v1#DeliveryModeDirectDownload
 * - http://purl.org/goodrelations/v1#DeliveryModeFreight
 * - http://purl.org/goodrelations/v1#DeliveryModeMail
 * - http://purl.org/goodrelations/v1#DeliveryModeOwnFleet
 * - http://purl.org/goodrelations/v1#DeliveryModePickUp
 * - http://purl.org/goodrelations/v1#DHL
 * - http://purl.org/goodrelations/v1#FederalExpress
 * - http://purl.org/goodrelations/v1#UPS
 */
export type DeliveryMethod = "https://schema.org/LockerDelivery" | "LockerDelivery" | "https://schema.org/OnSitePickup" | "OnSitePickup" | "https://schema.org/ParcelService" | "ParcelService" | DeliveryMethodLeaf;
interface DeliveryTimeSettingsBase extends ThingBase {
    /** The total delay between the receipt of the order and the goods reaching the final customer. */
    "deliveryTime"?: SchemaValue<ShippingDeliveryTime | IdReference, "deliveryTime">;
    /** This can be marked 'true' to indicate that some published {@link https://schema.org/DeliveryTimeSettings DeliveryTimeSettings} or {@link https://schema.org/ShippingRateSettings ShippingRateSettings} are intended to apply to all {@link https://schema.org/OfferShippingDetails OfferShippingDetails} published by the same merchant, when referenced by a {@link https://schema.org/shippingSettingsLink shippingSettingsLink} in those settings. It is not meaningful to use a 'true' value for this property alongside a transitTimeLabel (for {@link https://schema.org/DeliveryTimeSettings DeliveryTimeSettings}) or shippingLabel (for {@link https://schema.org/ShippingRateSettings ShippingRateSettings}), since this property is for use with unlabelled settings. */
    "isUnlabelledFallback"?: SchemaValue<Boolean, "isUnlabelledFallback">;
    /** indicates (possibly multiple) shipping destinations. These can be defined in several ways, e.g. postalCode ranges. */
    "shippingDestination"?: SchemaValue<DefinedRegion | IdReference, "shippingDestination">;
    /** Label to match an {@link https://schema.org/OfferShippingDetails OfferShippingDetails} with a {@link https://schema.org/DeliveryTimeSettings DeliveryTimeSettings} (within the context of a {@link https://schema.org/shippingSettingsLink shippingSettingsLink} cross-reference). */
    "transitTimeLabel"?: SchemaValue<Text, "transitTimeLabel">;
}
interface DeliveryTimeSettingsLeaf extends DeliveryTimeSettingsBase {
    "@type": "DeliveryTimeSettings";
}
/** A DeliveryTimeSettings represents re-usable pieces of shipping information, relating to timing. It is designed for publication on an URL that may be referenced via the {@link https://schema.org/shippingSettingsLink shippingSettingsLink} property of an {@link https://schema.org/OfferShippingDetails OfferShippingDetails}. Several occurrences can be published, distinguished (and identified/referenced) by their different values for {@link https://schema.org/transitTimeLabel transitTimeLabel}. */
export type DeliveryTimeSettings = DeliveryTimeSettingsLeaf;
interface DemandBase extends ThingBase {
    /** The payment method(s) that are accepted in general by an organization, or for some specific demand or offer. */
    "acceptedPaymentMethod"?: SchemaValue<LoanOrCredit | PaymentMethod | Text | IdReference, "acceptedPaymentMethod">;
    /** The amount of time that is required between accepting the offer and the actual usage of the resource or service. */
    "advanceBookingRequirement"?: SchemaValue<QuantitativeValue | IdReference, "advanceBookingRequirement">;
    /** The geographic area where a service or offered item is provided. */
    "areaServed"?: SchemaValue<AdministrativeArea | GeoShape | Place | Text | IdReference, "areaServed">;
    /**
     * An Amazon Standard Identification Number (ASIN) is a 10-character alphanumeric unique identifier assigned by Amazon.com and its partners for product identification within the Amazon organization (summary from {@link https://en.wikipedia.org/wiki/Amazon_Standard_Identification_Number Wikipedia}'s article).
     *
     * Note also that this is a definition for how to include ASINs in Schema.org data, and not a definition of ASINs in general - see documentation from Amazon for authoritative details. ASINs are most commonly encoded as text strings, but the [asin] property supports URL/URI as potential values too.
     */
    "asin"?: SchemaValue<Text | URL, "asin">;
    /** The availability of this item—for example In stock, Out of stock, Pre-order, etc. */
    "availability"?: SchemaValue<ItemAvailability | IdReference, "availability">;
    /** The end of the availability of the product or service included in the offer. */
    "availabilityEnds"?: SchemaValue<Date | DateTime | Time, "availabilityEnds">;
    /** The beginning of the availability of the product or service included in the offer. */
    "availabilityStarts"?: SchemaValue<Date | DateTime | Time, "availabilityStarts">;
    /** The place(s) from which the offer can be obtained (e.g. store locations). */
    "availableAtOrFrom"?: SchemaValue<Place | IdReference, "availableAtOrFrom">;
    /** The delivery method(s) available for this offer. */
    "availableDeliveryMethod"?: SchemaValue<DeliveryMethod | IdReference, "availableDeliveryMethod">;
    /** The business function (e.g. sell, lease, repair, dispose) of the offer or component of a bundle (TypeAndQuantityNode). The default is http://purl.org/goodrelations/v1#Sell. */
    "businessFunction"?: SchemaValue<BusinessFunction | IdReference, "businessFunction">;
    /** The typical delay between the receipt of the order and the goods either leaving the warehouse or being prepared for pickup, in case the delivery method is on site pickup. */
    "deliveryLeadTime"?: SchemaValue<QuantitativeValue | IdReference, "deliveryLeadTime">;
    /** The type(s) of customers for which the given offer is valid. */
    "eligibleCustomerType"?: SchemaValue<BusinessEntityType | IdReference, "eligibleCustomerType">;
    /** The duration for which the given offer is valid. */
    "eligibleDuration"?: SchemaValue<QuantitativeValue | IdReference, "eligibleDuration">;
    /** The interval and unit of measurement of ordering quantities for which the offer or price specification is valid. This allows e.g. specifying that a certain freight charge is valid only for a certain quantity. */
    "eligibleQuantity"?: SchemaValue<QuantitativeValue | IdReference, "eligibleQuantity">;
    /**
     * The ISO 3166-1 (ISO 3166-1 alpha-2) or ISO 3166-2 code, the place, or the GeoShape for the geo-political region(s) for which the offer or delivery charge specification is valid.
     *
     * See also {@link https://schema.org/ineligibleRegion ineligibleRegion}.
     */
    "eligibleRegion"?: SchemaValue<GeoShape | Place | Text | IdReference, "eligibleRegion">;
    /** The transaction volume, in a monetary unit, for which the offer or price specification is valid, e.g. for indicating a minimal purchasing volume, to express free shipping above a certain order volume, or to limit the acceptance of credit cards to purchases to a certain minimal amount. */
    "eligibleTransactionVolume"?: SchemaValue<PriceSpecification | IdReference, "eligibleTransactionVolume">;
    /**
     * A Global Trade Item Number ({@link https://www.gs1.org/standards/id-keys/gtin GTIN}). GTINs identify trade items, including products and services, using numeric identification codes.
     *
     * A correct {@link https://schema.org/gtin gtin} value should be a valid GTIN, which means that it should be an all-numeric string of either 8, 12, 13 or 14 digits, or a "GS1 Digital Link" URL based on such a string. The numeric component should also have a {@link https://www.gs1.org/services/check-digit-calculator valid GS1 check digit} and meet the other rules for valid GTINs. See also {@link http://www.gs1.org/barcodes/technical/idkeys/gtin GS1's GTIN Summary} and {@link https://en.wikipedia.org/wiki/Global_Trade_Item_Number Wikipedia} for more details. Left-padding of the gtin values is not required or encouraged. The {@link https://schema.org/gtin gtin} property generalizes the earlier {@link https://schema.org/gtin8 gtin8}, {@link https://schema.org/gtin12 gtin12}, {@link https://schema.org/gtin13 gtin13}, and {@link https://schema.org/gtin14 gtin14} properties.
     *
     * The GS1 {@link https://www.gs1.org/standards/Digital-Link/ digital link specifications} expresses GTINs as URLs (URIs, IRIs, etc.). Digital Links should be populated into the {@link https://schema.org/hasGS1DigitalLink hasGS1DigitalLink} attribute.
     *
     * Note also that this is a definition for how to include GTINs in Schema.org data, and not a definition of GTINs in general - see the GS1 documentation for authoritative details.
     */
    "gtin"?: SchemaValue<Text | URL, "gtin">;
    /** The GTIN-12 code of the product, or the product to which the offer refers. The GTIN-12 is the 12-digit GS1 Identification Key composed of a U.P.C. Company Prefix, Item Reference, and Check Digit used to identify trade items. See {@link http://www.gs1.org/barcodes/technical/idkeys/gtin GS1 GTIN Summary} for more details. */
    "gtin12"?: SchemaValue<Text, "gtin12">;
    /** The GTIN-13 code of the product, or the product to which the offer refers. This is equivalent to 13-digit ISBN codes and EAN UCC-13. Former 12-digit UPC codes can be converted into a GTIN-13 code by simply adding a preceding zero. See {@link http://www.gs1.org/barcodes/technical/idkeys/gtin GS1 GTIN Summary} for more details. */
    "gtin13"?: SchemaValue<Text, "gtin13">;
    /** The GTIN-14 code of the product, or the product to which the offer refers. See {@link http://www.gs1.org/barcodes/technical/idkeys/gtin GS1 GTIN Summary} for more details. */
    "gtin14"?: SchemaValue<Text, "gtin14">;
    /** The GTIN-8 code of the product, or the product to which the offer refers. This code is also known as EAN/UCC-8 or 8-digit EAN. See {@link http://www.gs1.org/barcodes/technical/idkeys/gtin GS1 GTIN Summary} for more details. */
    "gtin8"?: SchemaValue<Text, "gtin8">;
    /** This links to a node or nodes indicating the exact quantity of the products included in an {@link https://schema.org/Offer Offer} or {@link https://schema.org/ProductCollection ProductCollection}. */
    "includesObject"?: SchemaValue<TypeAndQuantityNode | IdReference, "includesObject">;
    /**
     * The ISO 3166-1 (ISO 3166-1 alpha-2) or ISO 3166-2 code, the place, or the GeoShape for the geo-political region(s) for which the offer or delivery charge specification is not valid, e.g. a region where the transaction is not allowed.
     *
     * See also {@link https://schema.org/eligibleRegion eligibleRegion}.
     */
    "ineligibleRegion"?: SchemaValue<GeoShape | Place | Text | IdReference, "ineligibleRegion">;
    /** The current approximate inventory level for the item or items. */
    "inventoryLevel"?: SchemaValue<QuantitativeValue | IdReference, "inventoryLevel">;
    /** A predefined value from OfferItemCondition specifying the condition of the product or service, or the products or services included in the offer. Also used for product return policies to specify the condition of products accepted for returns. */
    "itemCondition"?: SchemaValue<OfferItemCondition | IdReference, "itemCondition">;
    /** An item being offered (or demanded). The transactional nature of the offer or demand is documented using {@link https://schema.org/businessFunction businessFunction}, e.g. sell, lease etc. While several common expected types are listed explicitly in this definition, others can be used. Using a second type, such as Product or a subtype of Product, can clarify the nature of the offer. */
    "itemOffered"?: SchemaValue<AggregateOffer | CreativeWork | Event | MenuItem | Product | Service | Trip | IdReference, "itemOffered">;
    /** The Manufacturer Part Number (MPN) of the product, or the product to which the offer refers. */
    "mpn"?: SchemaValue<Text, "mpn">;
    /** One or more detailed price specifications, indicating the unit price and delivery or payment charges. */
    "priceSpecification"?: SchemaValue<PriceSpecification | IdReference, "priceSpecification">;
    /** An entity which offers (sells / leases / lends / loans) the services / goods. A seller may also be a provider. */
    "seller"?: SchemaValue<Organization | Person | IdReference, "seller">;
    /** The serial number or any alphanumeric identifier of a particular product. When attached to an offer, it is a shortcut for the serial number of the product included in the offer. */
    "serialNumber"?: SchemaValue<Text, "serialNumber">;
    /** The Stock Keeping Unit (SKU), i.e. a merchant-specific identifier for a product or service, or the product to which the offer refers. */
    "sku"?: SchemaValue<Text, "sku">;
    /** The date when the item becomes valid. */
    "validFrom"?: SchemaValue<Date | DateTime, "validFrom">;
    /** The date after when the item is not valid. For example the end of an offer, salary period, or a period of opening hours. */
    "validThrough"?: SchemaValue<Date | DateTime, "validThrough">;
    /** The warranty promise(s) included in the offer. */
    "warranty"?: SchemaValue<WarrantyPromise | IdReference, "warranty">;
}
interface DemandLeaf extends DemandBase {
    "@type": "Demand";
}
/** A demand entity represents the public, not necessarily binding, not necessarily exclusive, announcement by an organization or person to seek a certain type of goods or services. For describing demand using this type, the very same properties used for Offer apply. */
export type Demand = DemandLeaf;
interface DentistBase extends LocalBusinessBase, LocalBusinessBase, MedicalOrganizationBase {
}
interface DentistLeaf extends DentistBase {
    "@type": "Dentist";
}
/** A dentist. */
export type Dentist = DentistLeaf | string;
interface DepartActionLeaf extends MoveActionBase {
    "@type": "DepartAction";
}
/** The act of departing from a place. An agent departs from a fromLocation for a destination, optionally with participants. */
export type DepartAction = DepartActionLeaf;
interface DepartmentStoreLeaf extends LocalBusinessBase {
    "@type": "DepartmentStore";
}
/** A department store. */
export type DepartmentStore = DepartmentStoreLeaf | string;
interface DepositAccountBase extends BankAccountBase, InvestmentOrDepositBase {
}
interface DepositAccountLeaf extends DepositAccountBase {
    "@type": "DepositAccount";
}
/** A type of Bank Account with a main purpose of depositing funds to gain interest or other benefits. */
export type DepositAccount = DepositAccountLeaf;
interface DermatologyLeaf extends LocalBusinessBase {
    "@type": "Dermatology";
}
/** A specific branch of medical science that pertains to diagnosis and treatment of disorders of skin. */
export type Dermatology = DermatologyLeaf | string;
interface DiagnosticLabBase extends MedicalOrganizationBase {
    /** A diagnostic test or procedure offered by this lab. */
    "availableTest"?: SchemaValue<MedicalTest | IdReference, "availableTest">;
}
interface DiagnosticLabLeaf extends DiagnosticLabBase {
    "@type": "DiagnosticLab";
}
/** A medical laboratory that offers on-site or off-site diagnostic services. */
export type DiagnosticLab = DiagnosticLabLeaf | string;
interface DiagnosticProcedureLeaf extends MedicalProcedureBase {
    "@type": "DiagnosticProcedure";
}
/** A medical procedure intended primarily for diagnostic, as opposed to therapeutic, purposes. */
export type DiagnosticProcedure = DiagnosticProcedureLeaf;
interface DietBase extends CreativeWorkBase, MedicalEntityBase {
    /** Nutritional information specific to the dietary plan. May include dietary recommendations on what foods to avoid, what foods to consume, and specific alterations/deviations from the USDA or other regulatory body's approved dietary guidelines. */
    "dietFeatures"?: SchemaValue<Text, "dietFeatures">;
    /** People or organizations that endorse the plan. */
    "endorsers"?: SchemaValue<Organization | Person | IdReference, "endorsers">;
    /** Medical expert advice related to the plan. */
    "expertConsiderations"?: SchemaValue<Text, "expertConsiderations">;
    /** Specific physiologic benefits associated to the plan. */
    "physiologicalBenefits"?: SchemaValue<Text, "physiologicalBenefits">;
    /** Specific physiologic risks associated to the diet plan. */
    "risks"?: SchemaValue<Text, "risks">;
}
interface DietLeaf extends DietBase {
    "@type": "Diet";
}
/** A strategy of regulating the intake of food to achieve or maintain a specific health-related goal. */
export type Diet = DietLeaf;
interface DietarySupplementBase extends ProductBase, SubstanceBase {
    /** An active ingredient, typically chemical compounds and/or biologic substances. */
    "activeIngredient"?: SchemaValue<Text, "activeIngredient">;
    /** True if this item's name is a proprietary/brand name (vs. generic name). */
    "isProprietary"?: SchemaValue<Boolean, "isProprietary">;
    /** The drug or supplement's legal status, including any controlled substance schedules that apply. */
    "legalStatus"?: SchemaValue<DrugLegalStatus | MedicalEnumeration | Text | IdReference, "legalStatus">;
    /** Recommended intake of this supplement for a given population as defined by a specific recommending authority. */
    "maximumIntake"?: SchemaValue<MaximumDoseSchedule | IdReference, "maximumIntake">;
    /** The specific biochemical interaction through which this drug or supplement produces its pharmacological effect. */
    "mechanismOfAction"?: SchemaValue<Text, "mechanismOfAction">;
    /** The generic name of this drug or supplement. */
    "nonProprietaryName"?: SchemaValue<Text, "nonProprietaryName">;
    /** Proprietary name given to the diet plan, typically by its originator or creator. */
    "proprietaryName"?: SchemaValue<Text, "proprietaryName">;
    /** Recommended intake of this supplement for a given population as defined by a specific recommending authority. */
    "recommendedIntake"?: SchemaValue<RecommendedDoseSchedule | IdReference, "recommendedIntake">;
    /** Any potential safety concern associated with the supplement. May include interactions with other drugs and foods, pregnancy, breastfeeding, known adverse reactions, and documented efficacy of the supplement. */
    "safetyConsideration"?: SchemaValue<Text, "safetyConsideration">;
    /** Characteristics of the population for which this is intended, or which typically uses it, e.g. 'adults'. */
    "targetPopulation"?: SchemaValue<Text, "targetPopulation">;
}
interface DietarySupplementLeaf extends DietarySupplementBase {
    "@type": "DietarySupplement";
}
/** A product taken by mouth that contains a dietary ingredient intended to supplement the diet. Dietary ingredients may include vitamins, minerals, herbs or other botanicals, amino acids, and substances such as enzymes, organ tissues, glandulars and metabolites. */
export type DietarySupplement = DietarySupplementLeaf;
interface DietNutritionLeaf extends LocalBusinessBase {
    "@type": "DietNutrition";
}
/** Dietetics and nutrition as a medical specialty. */
export type DietNutrition = DietNutritionLeaf | string;
interface DigitalDocumentBase extends CreativeWorkBase {
    /** A permission related to the access to this document (e.g. permission to read or write an electronic document). For a public document, specify a grantee with an Audience with audienceType equal to "public". */
    "hasDigitalDocumentPermission"?: SchemaValue<DigitalDocumentPermission | IdReference, "hasDigitalDocumentPermission">;
}
interface DigitalDocumentLeaf extends DigitalDocumentBase {
    "@type": "DigitalDocument";
}
/** An electronic file or document. */
export type DigitalDocument = DigitalDocumentLeaf | NoteDigitalDocument | PresentationDigitalDocument | SpreadsheetDigitalDocument | TextDigitalDocument;
interface DigitalDocumentPermissionBase extends ThingBase {
    /** The person, organization, contact point, or audience that has been granted this permission. */
    "grantee"?: SchemaValue<Audience | ContactPoint | Organization | Person | IdReference, "grantee">;
    /** The type of permission granted the person, organization, or audience. */
    "permissionType"?: SchemaValue<DigitalDocumentPermissionType | IdReference, "permissionType">;
}
interface DigitalDocumentPermissionLeaf extends DigitalDocumentPermissionBase {
    "@type": "DigitalDocumentPermission";
}
/** A permission for a particular person or group to access a particular file. */
export type DigitalDocumentPermission = DigitalDocumentPermissionLeaf;
interface DigitalDocumentPermissionTypeLeaf extends EnumerationBase {
    "@type": "DigitalDocumentPermissionType";
}
/** A type of permission which can be granted for accessing a digital document. */
export type DigitalDocumentPermissionType = "https://schema.org/CommentPermission" | "CommentPermission" | "https://schema.org/ReadPermission" | "ReadPermission" | "https://schema.org/WritePermission" | "WritePermission" | DigitalDocumentPermissionTypeLeaf;
interface DigitalPlatformEnumerationLeaf extends EnumerationBase {
    "@type": "DigitalPlatformEnumeration";
}
/** Enumerates some common technology platforms, for use with properties such as {@link https://schema.org/actionPlatform actionPlatform}. It is not supposed to be comprehensive - when a suitable code is not enumerated here, textual or URL values can be used instead. These codes are at a fairly high level and do not deal with versioning and other nuance. Additional codes can be suggested {@link https://github.com/schemaorg/schemaorg/issues/3057 in github}. */
export type DigitalPlatformEnumeration = "https://schema.org/AndroidPlatform" | "AndroidPlatform" | "https://schema.org/DesktopWebPlatform" | "DesktopWebPlatform" | "https://schema.org/GenericWebPlatform" | "GenericWebPlatform" | "https://schema.org/IOSPlatform" | "IOSPlatform" | "https://schema.org/MobileWebPlatform" | "MobileWebPlatform" | DigitalPlatformEnumerationLeaf;
interface DisagreeActionLeaf extends ActionBase {
    "@type": "DisagreeAction";
}
/** The act of expressing a difference of opinion with the object. An agent disagrees to/about an object (a proposition, topic or theme) with participants. */
export type DisagreeAction = DisagreeActionLeaf;
interface DiscoverActionLeaf extends ActionBase {
    "@type": "DiscoverAction";
}
/** The act of discovering/finding an object. */
export type DiscoverAction = DiscoverActionLeaf;
interface DiscussionForumPostingLeaf extends SocialMediaPostingBase {
    "@type": "DiscussionForumPosting";
}
/** A posting to a discussion forum. */
export type DiscussionForumPosting = DiscussionForumPostingLeaf;
interface DislikeActionLeaf extends ActionBase {
    "@type": "DislikeAction";
}
/** The act of expressing a negative sentiment about the object. An agent dislikes an object (a proposition, topic or theme) with participants. */
export type DislikeAction = DislikeActionLeaf;
interface DistanceLeaf extends ThingBase {
    "@type": "Distance";
}
/** Properties that take Distances as values are of the form '<Number> <Length unit of measure>'. E.g., '7 ft'. */
export type Distance = DistanceLeaf | string;
interface DistilleryLeaf extends FoodEstablishmentBase {
    "@type": "Distillery";
}
/** A distillery. */
export type Distillery = DistilleryLeaf | string;
interface DonateActionBase extends TransferActionBase {
    /**
     * The offer price of a product, or of a price component when attached to PriceSpecification and its subtypes.
     *
     * Usage guidelines:
     * - Use the {@link https://schema.org/priceCurrency priceCurrency} property (with standard formats: {@link http://en.wikipedia.org/wiki/ISO_4217 ISO 4217 currency format}, e.g. "USD"; {@link https://en.wikipedia.org/wiki/List_of_cryptocurrencies Ticker symbol} for cryptocurrencies, e.g. "BTC"; well known names for {@link https://en.wikipedia.org/wiki/Local_exchange_trading_system Local Exchange Trading Systems} (LETS) and other currency types, e.g. "Ithaca HOUR") instead of including {@link http://en.wikipedia.org/wiki/Dollar_sign#Currencies_that_use_the_dollar_or_peso_sign ambiguous symbols} such as '$' in the value.
     * - Use '.' (Unicode 'FULL STOP' (U+002E)) rather than ',' to indicate a decimal point. Avoid using these symbols as a readability separator.
     * - Note that both {@link http://www.w3.org/TR/xhtml-rdfa-primer/#using-the-content-attribute RDFa} and Microdata syntax allow the use of a "content=" attribute for publishing simple machine-readable values alongside more human-friendly formatting.
     * - Use values from 0123456789 (Unicode 'DIGIT ZERO' (U+0030) to 'DIGIT NINE' (U+0039)) rather than superficially similar Unicode symbols.
     */
    "price"?: SchemaValue<Number | Text, "price">;
    /**
     * The currency of the price, or a price component when attached to {@link https://schema.org/PriceSpecification PriceSpecification} and its subtypes.
     *
     * Use standard formats: {@link http://en.wikipedia.org/wiki/ISO_4217 ISO 4217 currency format}, e.g. "USD"; {@link https://en.wikipedia.org/wiki/List_of_cryptocurrencies Ticker symbol} for cryptocurrencies, e.g. "BTC"; well known names for {@link https://en.wikipedia.org/wiki/Local_exchange_trading_system Local Exchange Trading Systems} (LETS) and other currency types, e.g. "Ithaca HOUR".
     */
    "priceCurrency"?: SchemaValue<Text, "priceCurrency">;
    /** One or more detailed price specifications, indicating the unit price and delivery or payment charges. */
    "priceSpecification"?: SchemaValue<PriceSpecification | IdReference, "priceSpecification">;
    /** A sub property of participant. The participant who is at the receiving end of the action. */
    "recipient"?: SchemaValue<Audience | ContactPoint | Organization | Person | IdReference, "recipient">;
}
interface DonateActionLeaf extends DonateActionBase {
    "@type": "DonateAction";
}
/** The act of providing goods, services, or money without compensation, often for philanthropic reasons. */
export type DonateAction = DonateActionLeaf;
interface DoseScheduleBase extends MedicalEntityBase {
    /** The unit of the dose, e.g. 'mg'. */
    "doseUnit"?: SchemaValue<Text, "doseUnit">;
    /** The value of the dose, e.g. 500. */
    "doseValue"?: SchemaValue<Number | QualitativeValue | IdReference, "doseValue">;
    /** How often the dose is taken, e.g. 'daily'. */
    "frequency"?: SchemaValue<Text, "frequency">;
    /** Characteristics of the population for which this is intended, or which typically uses it, e.g. 'adults'. */
    "targetPopulation"?: SchemaValue<Text, "targetPopulation">;
}
interface DoseScheduleLeaf extends DoseScheduleBase {
    "@type": "DoseSchedule";
}
/** A specific dosing schedule for a drug or supplement. */
export type DoseSchedule = DoseScheduleLeaf | MaximumDoseSchedule | RecommendedDoseSchedule | ReportedDoseSchedule;
interface DownloadActionLeaf extends TransferActionBase {
    "@type": "DownloadAction";
}
/** The act of downloading an object. */
export type DownloadAction = DownloadActionLeaf;
interface DrawActionLeaf extends ActionBase {
    "@type": "DrawAction";
}
/** The act of producing a visual/graphical representation of an object, typically with a pen/pencil and paper as instruments. */
export type DrawAction = DrawActionLeaf;
interface DrawingLeaf extends CreativeWorkBase {
    "@type": "Drawing";
}
/** A picture or diagram made with a pencil, pen, or crayon rather than paint. */
export type Drawing = DrawingLeaf;
interface DrinkActionLeaf extends ConsumeActionBase {
    "@type": "DrinkAction";
}
/** The act of swallowing liquids. */
export type DrinkAction = DrinkActionLeaf;
interface DriveWheelConfigurationValueLeaf extends QualitativeValueBase {
    "@type": "DriveWheelConfigurationValue";
}
/** A value indicating which roadwheels will receive torque. */
export type DriveWheelConfigurationValue = "https://schema.org/AllWheelDriveConfiguration" | "AllWheelDriveConfiguration" | "https://schema.org/FourWheelDriveConfiguration" | "FourWheelDriveConfiguration" | "https://schema.org/FrontWheelDriveConfiguration" | "FrontWheelDriveConfiguration" | "https://schema.org/RearWheelDriveConfiguration" | "RearWheelDriveConfiguration" | DriveWheelConfigurationValueLeaf;
interface DrugBase extends ProductBase, SubstanceBase {
    /** An active ingredient, typically chemical compounds and/or biologic substances. */
    "activeIngredient"?: SchemaValue<Text, "activeIngredient">;
    /** A route by which this drug may be administered, e.g. 'oral'. */
    "administrationRoute"?: SchemaValue<Text, "administrationRoute">;
    /** Any precaution, guidance, contraindication, etc. related to consumption of alcohol while taking this drug. */
    "alcoholWarning"?: SchemaValue<Text, "alcoholWarning">;
    /** An available dosage strength for the drug. */
    "availableStrength"?: SchemaValue<DrugStrength | IdReference, "availableStrength">;
    /** Any precaution, guidance, contraindication, etc. related to this drug's use by breastfeeding mothers. */
    "breastfeedingWarning"?: SchemaValue<Text, "breastfeedingWarning">;
    /**
     * Description of the absorption and elimination of drugs, including their concentration (pharmacokinetics, pK) and biological effects (pharmacodynamics, pD).
     *
     * @deprecated Consider using https://schema.org/clinicalPharmacology instead.
     */
    "clincalPharmacology"?: SchemaValue<Text, "clincalPharmacology">;
    /** Description of the absorption and elimination of drugs, including their concentration (pharmacokinetics, pK) and biological effects (pharmacodynamics, pD). */
    "clinicalPharmacology"?: SchemaValue<Text, "clinicalPharmacology">;
    /** A dosage form in which this drug/supplement is available, e.g. 'tablet', 'suspension', 'injection'. */
    "dosageForm"?: SchemaValue<Text, "dosageForm">;
    /** A dosing schedule for the drug for a given population, either observed, recommended, or maximum dose based on the type used. */
    "doseSchedule"?: SchemaValue<DoseSchedule | IdReference, "doseSchedule">;
    /** The class of drug this belongs to (e.g., statins). */
    "drugClass"?: SchemaValue<DrugClass | IdReference, "drugClass">;
    /** The unit in which the drug is measured, e.g. '5 mg tablet'. */
    "drugUnit"?: SchemaValue<Text, "drugUnit">;
    /** Any precaution, guidance, contraindication, etc. related to consumption of specific foods while taking this drug. */
    "foodWarning"?: SchemaValue<Text, "foodWarning">;
    /** The insurance plans that cover this drug. */
    "includedInHealthInsurancePlan"?: SchemaValue<HealthInsurancePlan | IdReference, "includedInHealthInsurancePlan">;
    /** Another drug that is known to interact with this drug in a way that impacts the effect of this drug or causes a risk to the patient. Note: disease interactions are typically captured as contraindications. */
    "interactingDrug"?: SchemaValue<Drug | IdReference, "interactingDrug">;
    /** True if the drug is available in a generic form (regardless of name). */
    "isAvailableGenerically"?: SchemaValue<Boolean, "isAvailableGenerically">;
    /** True if this item's name is a proprietary/brand name (vs. generic name). */
    "isProprietary"?: SchemaValue<Boolean, "isProprietary">;
    /** Link to the drug's label details. */
    "labelDetails"?: SchemaValue<URL, "labelDetails">;
    /** The drug or supplement's legal status, including any controlled substance schedules that apply. */
    "legalStatus"?: SchemaValue<DrugLegalStatus | MedicalEnumeration | Text | IdReference, "legalStatus">;
    /** Recommended intake of this supplement for a given population as defined by a specific recommending authority. */
    "maximumIntake"?: SchemaValue<MaximumDoseSchedule | IdReference, "maximumIntake">;
    /** The specific biochemical interaction through which this drug or supplement produces its pharmacological effect. */
    "mechanismOfAction"?: SchemaValue<Text, "mechanismOfAction">;
    /** The generic name of this drug or supplement. */
    "nonProprietaryName"?: SchemaValue<Text, "nonProprietaryName">;
    /** Any information related to overdose on a drug, including signs or symptoms, treatments, contact information for emergency response. */
    "overdosage"?: SchemaValue<Text, "overdosage">;
    /** Pregnancy category of this drug. */
    "pregnancyCategory"?: SchemaValue<DrugPregnancyCategory | IdReference, "pregnancyCategory">;
    /** Any precaution, guidance, contraindication, etc. related to this drug's use during pregnancy. */
    "pregnancyWarning"?: SchemaValue<Text, "pregnancyWarning">;
    /** Link to prescribing information for the drug. */
    "prescribingInfo"?: SchemaValue<URL, "prescribingInfo">;
    /** Indicates the status of drug prescription, e.g. local catalogs classifications or whether the drug is available by prescription or over-the-counter, etc. */
    "prescriptionStatus"?: SchemaValue<DrugPrescriptionStatus | Text | IdReference, "prescriptionStatus">;
    /** Proprietary name given to the diet plan, typically by its originator or creator. */
    "proprietaryName"?: SchemaValue<Text, "proprietaryName">;
    /** Any other drug related to this one, for example commonly-prescribed alternatives. */
    "relatedDrug"?: SchemaValue<Drug | IdReference, "relatedDrug">;
    /** The RxCUI drug identifier from RXNORM. */
    "rxcui"?: SchemaValue<Text, "rxcui">;
    /** Any FDA or other warnings about the drug (text or URL). */
    "warning"?: SchemaValue<Text | URL, "warning">;
}
interface DrugLeaf extends DrugBase {
    "@type": "Drug";
}
/** A chemical or biologic substance, used as a medical therapy, that has a physiological effect on an organism. Here the term drug is used interchangeably with the term medicine although clinical knowledge makes a clear difference between them. */
export type Drug = DrugLeaf;
interface DrugClassBase extends MedicalEntityBase {
    /** Specifying a drug or medicine used in a medication procedure. */
    "drug"?: SchemaValue<Drug | IdReference, "drug">;
}
interface DrugClassLeaf extends DrugClassBase {
    "@type": "DrugClass";
}
/** A class of medical drugs, e.g., statins. Classes can represent general pharmacological class, common mechanisms of action, common physiological effects, etc. */
export type DrugClass = DrugClassLeaf;
interface DrugCostBase extends MedicalEntityBase {
    /** The location in which the status applies. */
    "applicableLocation"?: SchemaValue<AdministrativeArea | IdReference, "applicableLocation">;
    /** The category of cost, such as wholesale, retail, reimbursement cap, etc. */
    "costCategory"?: SchemaValue<DrugCostCategory | IdReference, "costCategory">;
    /** The currency (in 3-letter) of the drug cost. See: http://en.wikipedia.org/wiki/ISO_4217. */
    "costCurrency"?: SchemaValue<Text, "costCurrency">;
    /** Additional details to capture the origin of the cost data. For example, 'Medicare Part B'. */
    "costOrigin"?: SchemaValue<Text, "costOrigin">;
    /** The cost per unit of the drug. */
    "costPerUnit"?: SchemaValue<Number | QualitativeValue | Text | IdReference, "costPerUnit">;
    /** The unit in which the drug is measured, e.g. '5 mg tablet'. */
    "drugUnit"?: SchemaValue<Text, "drugUnit">;
}
interface DrugCostLeaf extends DrugCostBase {
    "@type": "DrugCost";
}
/** The cost per unit of a medical drug. Note that this type is not meant to represent the price in an offer of a drug for sale; see the Offer type for that. This type will typically be used to tag wholesale or average retail cost of a drug, or maximum reimbursable cost. Costs of medical drugs vary widely depending on how and where they are paid for, so while this type captures some of the variables, costs should be used with caution by consumers of this schema's markup. */
export type DrugCost = DrugCostLeaf;
interface DrugCostCategoryLeaf extends EnumerationBase {
    "@type": "DrugCostCategory";
}
/** Enumerated categories of medical drug costs. */
export type DrugCostCategory = "https://schema.org/ReimbursementCap" | "ReimbursementCap" | "https://schema.org/Retail" | "Retail" | "https://schema.org/Wholesale" | "Wholesale" | DrugCostCategoryLeaf;
interface DrugLegalStatusBase extends MedicalEntityBase {
    /** The location in which the status applies. */
    "applicableLocation"?: SchemaValue<AdministrativeArea | IdReference, "applicableLocation">;
}
interface DrugLegalStatusLeaf extends DrugLegalStatusBase {
    "@type": "DrugLegalStatus";
}
/** The legal availability status of a medical drug. */
export type DrugLegalStatus = DrugLegalStatusLeaf;
interface DrugPregnancyCategoryLeaf extends EnumerationBase {
    "@type": "DrugPregnancyCategory";
}
/** Categories that represent an assessment of the risk of fetal injury due to a drug or pharmaceutical used as directed by the mother during pregnancy. */
export type DrugPregnancyCategory = "https://schema.org/FDAcategoryA" | "FDAcategoryA" | "https://schema.org/FDAcategoryB" | "FDAcategoryB" | "https://schema.org/FDAcategoryC" | "FDAcategoryC" | "https://schema.org/FDAcategoryD" | "FDAcategoryD" | "https://schema.org/FDAcategoryX" | "FDAcategoryX" | "https://schema.org/FDAnotEvaluated" | "FDAnotEvaluated" | DrugPregnancyCategoryLeaf;
interface DrugPrescriptionStatusLeaf extends EnumerationBase {
    "@type": "DrugPrescriptionStatus";
}
/** Indicates whether this drug is available by prescription or over-the-counter. */
export type DrugPrescriptionStatus = "https://schema.org/OTC" | "OTC" | "https://schema.org/PrescriptionOnly" | "PrescriptionOnly" | DrugPrescriptionStatusLeaf;
interface DrugStrengthBase extends MedicalEntityBase {
    /** An active ingredient, typically chemical compounds and/or biologic substances. */
    "activeIngredient"?: SchemaValue<Text, "activeIngredient">;
    /** The location in which the strength is available. */
    "availableIn"?: SchemaValue<AdministrativeArea | IdReference, "availableIn">;
    /** Recommended intake of this supplement for a given population as defined by a specific recommending authority. */
    "maximumIntake"?: SchemaValue<MaximumDoseSchedule | IdReference, "maximumIntake">;
    /** The units of an active ingredient's strength, e.g. mg. */
    "strengthUnit"?: SchemaValue<Text, "strengthUnit">;
    /** The value of an active ingredient's strength, e.g. 325. */
    "strengthValue"?: SchemaValue<Number, "strengthValue">;
}
interface DrugStrengthLeaf extends DrugStrengthBase {
    "@type": "DrugStrength";
}
/** A specific strength in which a medical drug is available in a specific country. */
export type DrugStrength = DrugStrengthLeaf;
interface DryCleaningOrLaundryLeaf extends LocalBusinessBase {
    "@type": "DryCleaningOrLaundry";
}
/** A dry-cleaning business. */
export type DryCleaningOrLaundry = DryCleaningOrLaundryLeaf | string;
interface DurationLeaf extends ThingBase {
    "@type": "Duration";
}
/** Quantity: Duration (use {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 duration format}). */
export type Duration = DurationLeaf | string;
interface EatActionLeaf extends ConsumeActionBase {
    "@type": "EatAction";
}
/** The act of swallowing solid objects. */
export type EatAction = EatActionLeaf;
interface EducationalAudienceBase extends AudienceBase {
    /** An educationalRole of an EducationalAudience. */
    "educationalRole"?: SchemaValue<Text, "educationalRole">;
}
interface EducationalAudienceLeaf extends EducationalAudienceBase {
    "@type": "EducationalAudience";
}
/** An EducationalAudience. */
export type EducationalAudience = EducationalAudienceLeaf;
interface EducationalOccupationalCredentialBase extends CreativeWorkBase {
    /** Knowledge, skill, ability or personal attribute that must be demonstrated by a person or other entity in order to do something such as earn an Educational Occupational Credential or understand a LearningResource. */
    "competencyRequired"?: SchemaValue<DefinedTerm | Text | URL | IdReference, "competencyRequired">;
    /** The category or type of credential being described, for example "degree”, “certificate”, “badge”, or more specific term. */
    "credentialCategory"?: SchemaValue<DefinedTerm | Text | URL | IdReference, "credentialCategory">;
    /** The level in terms of progression through an educational or training context. Examples of educational levels include 'beginner', 'intermediate' or 'advanced', and formal sets of level indicators. */
    "educationalLevel"?: SchemaValue<DefinedTerm | Text | URL | IdReference, "educationalLevel">;
    /** An organization that acknowledges the validity, value or utility of a credential. Note: recognition may include a process of quality assurance or accreditation. */
    "recognizedBy"?: SchemaValue<Organization | IdReference, "recognizedBy">;
    /** The duration of validity of a permit or similar thing. */
    "validFor"?: SchemaValue<Duration | IdReference, "validFor">;
    /** The geographic area where the item is valid. Applies for example to a {@link https://schema.org/Permit Permit}, a {@link https://schema.org/Certification Certification}, or an {@link https://schema.org/EducationalOccupationalCredential EducationalOccupationalCredential}. */
    "validIn"?: SchemaValue<AdministrativeArea | IdReference, "validIn">;
}
interface EducationalOccupationalCredentialLeaf extends EducationalOccupationalCredentialBase {
    "@type": "EducationalOccupationalCredential";
}
/** An educational or occupational credential. A diploma, academic degree, certification, qualification, badge, etc., that may be awarded to a person or other entity that meets the requirements defined by the credentialer. */
export type EducationalOccupationalCredential = EducationalOccupationalCredentialLeaf;
interface EducationalOccupationalProgramBase extends ThingBase {
    /** The date on which the program stops collecting applications for the next enrollment cycle. Flexible application deadlines (for example, a program with rolling admissions) can be described in a textual string, rather than as a DateTime. */
    "applicationDeadline"?: SchemaValue<Date | Text, "applicationDeadline">;
    /** The date at which the program begins collecting applications for the next enrollment cycle. */
    "applicationStartDate"?: SchemaValue<Date, "applicationStartDate">;
    /** The day of the week for which these opening hours are valid. */
    "dayOfWeek"?: SchemaValue<DayOfWeek | IdReference, "dayOfWeek">;
    /** A description of the qualification, award, certificate, diploma or other educational credential awarded as a consequence of successful completion of this course or program. */
    "educationalCredentialAwarded"?: SchemaValue<EducationalOccupationalCredential | Text | URL | IdReference, "educationalCredentialAwarded">;
    /** Similar to courseMode, the medium or means of delivery of the program as a whole. The value may either be a text label (e.g. "online", "onsite" or "blended"; "synchronous" or "asynchronous"; "full-time" or "part-time") or a URL reference to a term from a controlled vocabulary (e.g. https://ceds.ed.gov/element/001311#Asynchronous ). */
    "educationalProgramMode"?: SchemaValue<Text | URL, "educationalProgramMode">;
    /** The end date and time of the item (in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 date format}). */
    "endDate"?: SchemaValue<Date | DateTime, "endDate">;
    /** A financial aid type or program which students may use to pay for tuition or fees associated with the program. */
    "financialAidEligible"?: SchemaValue<DefinedTerm | Text | IdReference, "financialAidEligible">;
    /** A course or class that is one of the learning opportunities that constitute an educational / occupational program. No information is implied about whether the course is mandatory or optional; no guarantee is implied about whether the course will be available to everyone on the program. */
    "hasCourse"?: SchemaValue<Course | IdReference, "hasCourse">;
    /** The maximum number of students who may be enrolled in the program. */
    "maximumEnrollment"?: SchemaValue<Integer, "maximumEnrollment">;
    /** The number of credits or units awarded by a Course or required to complete an EducationalOccupationalProgram. */
    "numberOfCredits"?: SchemaValue<Integer | StructuredValue | IdReference, "numberOfCredits">;
    /**
     * A category describing the job, preferably using a term from a taxonomy such as {@link http://www.onetcenter.org/taxonomy.html BLS O*NET-SOC}, {@link https://www.ilo.org/public/english/bureau/stat/isco/isco08/ ISCO-08} or similar, with the property repeated for each applicable value. Ideally the taxonomy should be identified, and both the textual label and formal code for the category should be provided.
     *
     * Note: for historical reasons, any textual label and formal code provided as a literal may be assumed to be from O*NET-SOC.
     */
    "occupationalCategory"?: SchemaValue<CategoryCode | Text | IdReference, "occupationalCategory">;
    /** A description of the qualification, award, certificate, diploma or other occupational credential awarded as a consequence of successful completion of this course or program. */
    "occupationalCredentialAwarded"?: SchemaValue<EducationalOccupationalCredential | Text | URL | IdReference, "occupationalCredentialAwarded">;
    /** An offer to provide this item—for example, an offer to sell a product, rent the DVD of a movie, perform a service, or give away tickets to an event. Use {@link https://schema.org/businessFunction businessFunction} to indicate the kind of transaction offered, i.e. sell, lease, etc. This property can also be used to describe a {@link https://schema.org/Demand Demand}. While this property is listed as expected on a number of common types, it can be used in others. In that case, using a second type, such as Product or a subtype of Product, can clarify the nature of the offer. */
    "offers"?: SchemaValue<Demand | Offer | IdReference, "offers">;
    /** Prerequisites for enrolling in the program. */
    "programPrerequisites"?: SchemaValue<AlignmentObject | Course | EducationalOccupationalCredential | Text | IdReference, "programPrerequisites">;
    /** The type of educational or occupational program. For example, classroom, internship, alternance, etc. */
    "programType"?: SchemaValue<DefinedTerm | Text | IdReference, "programType">;
    /** The service provider, service operator, or service performer; the goods producer. Another party (a seller) may offer those services or goods on behalf of the provider. A provider may also serve as the seller. */
    "provider"?: SchemaValue<Organization | Person | IdReference, "provider">;
    /** The expected salary upon completing the training. */
    "salaryUponCompletion"?: SchemaValue<MonetaryAmountDistribution | IdReference, "salaryUponCompletion">;
    /** The start date and time of the item (in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 date format}). */
    "startDate"?: SchemaValue<Date | DateTime, "startDate">;
    /** The amount of time in a term as defined by the institution. A term is a length of time where students take one or more classes. Semesters and quarters are common units for term. */
    "termDuration"?: SchemaValue<Duration | IdReference, "termDuration">;
    /** The number of times terms of study are offered per year. Semesters and quarters are common units for term. For example, if the student can only take 2 semesters for the program in one year, then termsPerYear should be 2. */
    "termsPerYear"?: SchemaValue<Number, "termsPerYear">;
    /** The time of day the program normally runs. For example, "evenings". */
    "timeOfDay"?: SchemaValue<Text, "timeOfDay">;
    /** The expected length of time to complete the program if attending full-time. */
    "timeToComplete"?: SchemaValue<Duration | IdReference, "timeToComplete">;
    /** The estimated salary earned while in the program. */
    "trainingSalary"?: SchemaValue<MonetaryAmountDistribution | IdReference, "trainingSalary">;
    /** The number of credits or units a full-time student would be expected to take in 1 term however 'term' is defined by the institution. */
    "typicalCreditsPerTerm"?: SchemaValue<Integer | StructuredValue | IdReference, "typicalCreditsPerTerm">;
}
interface EducationalOccupationalProgramLeaf extends EducationalOccupationalProgramBase {
    "@type": "EducationalOccupationalProgram";
}
/** A program offered by an institution which determines the learning progress to achieve an outcome, usually a credential like a degree or certificate. This would define a discrete set of opportunities (e.g., job, courses) that together constitute a program with a clear start, end, set of requirements, and transition to a new occupational opportunity (e.g., a job), or sometimes a higher educational opportunity (e.g., an advanced degree). */
export type EducationalOccupationalProgram = EducationalOccupationalProgramLeaf | WorkBasedProgram;
interface EducationalOrganizationBase extends OrganizationBase, CivicStructureBase {
    /** Alumni of an organization. */
    "alumni"?: SchemaValue<Person | IdReference, "alumni">;
}
interface EducationalOrganizationLeaf extends EducationalOrganizationBase {
    "@type": "EducationalOrganization";
}
/** An educational organization. */
export type EducationalOrganization = EducationalOrganizationLeaf | CollegeOrUniversity | ElementarySchool | HighSchool | MiddleSchool | Preschool | School | string;
interface EducationEventBase extends EventBase {
    /** The item being described is intended to assess the competency or learning outcome defined by the referenced term. */
    "assesses"?: SchemaValue<DefinedTerm | Text | IdReference, "assesses">;
    /** The level in terms of progression through an educational or training context. Examples of educational levels include 'beginner', 'intermediate' or 'advanced', and formal sets of level indicators. */
    "educationalLevel"?: SchemaValue<DefinedTerm | Text | URL | IdReference, "educationalLevel">;
    /** The item being described is intended to help a person learn the competency or learning outcome defined by the referenced term. */
    "teaches"?: SchemaValue<DefinedTerm | Text | IdReference, "teaches">;
}
interface EducationEventLeaf extends EducationEventBase {
    "@type": "EducationEvent";
}
/** Event type: Education event. */
export type EducationEvent = EducationEventLeaf;
interface ElectricianLeaf extends LocalBusinessBase {
    "@type": "Electrician";
}
/** An electrician. */
export type Electrician = ElectricianLeaf | string;
interface ElectronicsStoreLeaf extends LocalBusinessBase {
    "@type": "ElectronicsStore";
}
/** An electronics store. */
export type ElectronicsStore = ElectronicsStoreLeaf | string;
interface ElementarySchoolLeaf extends EducationalOrganizationBase {
    "@type": "ElementarySchool";
}
/** An elementary school. */
export type ElementarySchool = ElementarySchoolLeaf | string;
interface EmailMessageLeaf extends MessageBase {
    "@type": "EmailMessage";
}
/** An email message. */
export type EmailMessage = EmailMessageLeaf;
interface EmbassyLeaf extends CivicStructureBase {
    "@type": "Embassy";
}
/** An embassy. */
export type Embassy = EmbassyLeaf | string;
interface EmergencyLeaf extends LocalBusinessBase {
    "@type": "Emergency";
}
/** A specific branch of medical science that deals with the evaluation and initial treatment of medical conditions caused by trauma or sudden illness. */
export type Emergency = EmergencyLeaf | string;
interface EmergencyServiceLeaf extends LocalBusinessBase {
    "@type": "EmergencyService";
}
/** An emergency service, such as a fire station or ER. */
export type EmergencyService = EmergencyServiceLeaf | FireStation | Hospital | PoliceStation | string;
interface EmployerAggregateRatingLeaf extends AggregateRatingBase {
    "@type": "EmployerAggregateRating";
}
/** An aggregate rating of an Organization related to its role as an employer. */
export type EmployerAggregateRating = EmployerAggregateRatingLeaf;
interface EmployerReviewLeaf extends ReviewBase {
    "@type": "EmployerReview";
}
/** An {@link https://schema.org/EmployerReview EmployerReview} is a review of an {@link https://schema.org/Organization Organization} regarding its role as an employer, written by a current or former employee of that organization. */
export type EmployerReview = EmployerReviewLeaf;
interface EmploymentAgencyLeaf extends LocalBusinessBase {
    "@type": "EmploymentAgency";
}
/** An employment agency. */
export type EmploymentAgency = EmploymentAgencyLeaf | string;
interface EndorseActionBase extends ActionBase {
    /** A sub property of participant. The person/organization being supported. */
    "endorsee"?: SchemaValue<Organization | Person | IdReference, "endorsee">;
}
interface EndorseActionLeaf extends EndorseActionBase {
    "@type": "EndorseAction";
}
/** An agent approves/certifies/likes/supports/sanctions an object. */
export type EndorseAction = EndorseActionLeaf;
interface EndorsementRatingLeaf extends RatingBase {
    "@type": "EndorsementRating";
}
/**
 * An EndorsementRating is a rating that expresses some level of endorsement, for example inclusion in a "critic's pick" blog, a "Like" or "+1" on a social network. It can be considered the {@link https://schema.org/result result} of an {@link https://schema.org/EndorseAction EndorseAction} in which the {@link https://schema.org/object object} of the action is rated positively by some {@link https://schema.org/agent agent}. As is common elsewhere in schema.org, it is sometimes more useful to describe the results of such an action without explicitly describing the {@link https://schema.org/Action Action}.
 *
 * An {@link https://schema.org/EndorsementRating EndorsementRating} may be part of a numeric scale or organized system, but this is not required: having an explicit type for indicating a positive, endorsement rating is particularly useful in the absence of numeric scales as it helps consumers understand that the rating is broadly positive.
 */
export type EndorsementRating = EndorsementRatingLeaf;
interface EnergyLeaf extends ThingBase {
    "@type": "Energy";
}
/** Properties that take Energy as values are of the form '<Number> <Energy unit of measure>'. */
export type Energy = EnergyLeaf | string;
interface EnergyConsumptionDetailsBase extends ThingBase {
    /** Specifies the most energy efficient class on the regulated EU energy consumption scale for the product category a product belongs to. For example, energy consumption for televisions placed on the market after January 1, 2020 is scaled from D to A+++. */
    "energyEfficiencyScaleMax"?: SchemaValue<EUEnergyEfficiencyEnumeration | IdReference, "energyEfficiencyScaleMax">;
    /** Specifies the least energy efficient class on the regulated EU energy consumption scale for the product category a product belongs to. For example, energy consumption for televisions placed on the market after January 1, 2020 is scaled from D to A+++. */
    "energyEfficiencyScaleMin"?: SchemaValue<EUEnergyEfficiencyEnumeration | IdReference, "energyEfficiencyScaleMin">;
    /** Defines the energy efficiency Category (which could be either a rating out of range of values or a yes/no certification) for a product according to an international energy efficiency standard. */
    "hasEnergyEfficiencyCategory"?: SchemaValue<EnergyEfficiencyEnumeration | IdReference, "hasEnergyEfficiencyCategory">;
}
interface EnergyConsumptionDetailsLeaf extends EnergyConsumptionDetailsBase {
    "@type": "EnergyConsumptionDetails";
}
/** EnergyConsumptionDetails represents information related to the energy efficiency of a product that consumes energy. The information that can be provided is based on international regulations such as for example {@link https://eur-lex.europa.eu/eli/reg/2017/1369/oj EU directive 2017/1369} for energy labeling and the {@link https://www.ftc.gov/enforcement/rules/rulemaking-regulatory-reform-proceedings/energy-water-use-labeling-consumer Energy labeling rule} under the Energy Policy and Conservation Act (EPCA) in the US. */
export type EnergyConsumptionDetails = EnergyConsumptionDetailsLeaf;
interface EnergyEfficiencyEnumerationLeaf extends EnumerationBase {
    "@type": "EnergyEfficiencyEnumeration";
}
/** Enumerates energy efficiency levels (also known as "classes" or "ratings") and certifications that are part of several international energy efficiency standards. */
export type EnergyEfficiencyEnumeration = EnergyEfficiencyEnumerationLeaf | EnergyStarEnergyEfficiencyEnumeration | EUEnergyEfficiencyEnumeration;
interface EnergyStarEnergyEfficiencyEnumerationLeaf extends EnumerationBase {
    "@type": "EnergyStarEnergyEfficiencyEnumeration";
}
/** Used to indicate whether a product is EnergyStar certified. */
export type EnergyStarEnergyEfficiencyEnumeration = "https://schema.org/EnergyStarCertified" | "EnergyStarCertified" | EnergyStarEnergyEfficiencyEnumerationLeaf;
interface EngineSpecificationBase extends ThingBase {
    /**
     * The volume swept by all of the pistons inside the cylinders of an internal combustion engine in a single movement.
     *
     * Typical unit code(s): CMQ for cubic centimeter, LTR for liters, INQ for cubic inches
     * - Note 1: You can link to information about how the given value has been determined using the {@link https://schema.org/valueReference valueReference} property.
     * - Note 2: You can use {@link https://schema.org/minValue minValue} and {@link https://schema.org/maxValue maxValue} to indicate ranges.
     */
    "engineDisplacement"?: SchemaValue<QuantitativeValue | IdReference, "engineDisplacement">;
    /**
     * The power of the vehicle's engine. Typical unit code(s): KWT for kilowatt, BHP for brake horsepower, N12 for metric horsepower (PS, with 1 PS = 735,49875 W)
     * - Note 1: There are many different ways of measuring an engine's power. For an overview, see {@link http://en.wikipedia.org/wiki/Horsepower#Engine_power_test_codes http://en.wikipedia.org/wiki/Horsepower#Engine_power_test_codes}.
     * - Note 2: You can link to information about how the given value has been determined using the {@link https://schema.org/valueReference valueReference} property.
     * - Note 3: You can use {@link https://schema.org/minValue minValue} and {@link https://schema.org/maxValue maxValue} to indicate ranges.
     */
    "enginePower"?: SchemaValue<QuantitativeValue | IdReference, "enginePower">;
    /** The type of engine or engines powering the vehicle. */
    "engineType"?: SchemaValue<QualitativeValue | Text | URL | IdReference, "engineType">;
    /** The type of fuel suitable for the engine or engines of the vehicle. If the vehicle has only one engine, this property can be attached directly to the vehicle. */
    "fuelType"?: SchemaValue<QualitativeValue | Text | URL | IdReference, "fuelType">;
    /**
     * The torque (turning force) of the vehicle's engine.
     *
     * Typical unit code(s): NU for newton metre (N m), F17 for pound-force per foot, or F48 for pound-force per inch
     * - Note 1: You can link to information about how the given value has been determined (e.g. reference RPM) using the {@link https://schema.org/valueReference valueReference} property.
     * - Note 2: You can use {@link https://schema.org/minValue minValue} and {@link https://schema.org/maxValue maxValue} to indicate ranges.
     */
    "torque"?: SchemaValue<QuantitativeValue | IdReference, "torque">;
}
interface EngineSpecificationLeaf extends EngineSpecificationBase {
    "@type": "EngineSpecification";
}
/** Information about the engine of the vehicle. A vehicle can have multiple engines represented by multiple engine specification entities. */
export type EngineSpecification = EngineSpecificationLeaf;
interface EntertainmentBusinessLeaf extends LocalBusinessBase {
    "@type": "EntertainmentBusiness";
}
/** A business providing entertainment. */
export type EntertainmentBusiness = EntertainmentBusinessLeaf | AdultEntertainment | AmusementPark | ArtGallery | Casino | ComedyClub | MovieTheater | NightClub | string;
interface EntryPointBase extends ThingBase {
    /** An application that can complete the request. */
    "actionApplication"?: SchemaValue<SoftwareApplication | IdReference, "actionApplication">;
    /** The high level platform(s) where the Action can be performed for the given URL. To specify a specific application or operating system instance, use actionApplication. */
    "actionPlatform"?: SchemaValue<DigitalPlatformEnumeration | Text | URL | IdReference, "actionPlatform">;
    /**
     * An application that can complete the request.
     *
     * @deprecated Consider using https://schema.org/actionApplication instead.
     */
    "application"?: SchemaValue<SoftwareApplication | IdReference, "application">;
    /** The supported content type(s) for an EntryPoint response. */
    "contentType"?: SchemaValue<Text, "contentType">;
    /** The supported encoding type(s) for an EntryPoint request. */
    "encodingType"?: SchemaValue<Text, "encodingType">;
    /** An HTTP method that specifies the appropriate HTTP method for a request to an HTTP EntryPoint. Values are capitalized strings as used in HTTP. */
    "httpMethod"?: SchemaValue<Text, "httpMethod">;
    /** An url template (RFC6570) that will be used to construct the target of the execution of the action. */
    "urlTemplate"?: SchemaValue<Text, "urlTemplate">;
}
interface EntryPointLeaf extends EntryPointBase {
    "@type": "EntryPoint";
}
/** An entry point, within some Web-based protocol. */
export type EntryPoint = EntryPointLeaf | string;
interface EnumerationBase extends ThingBase {
    /** Relates a term (i.e. a property, class or enumeration) to one that supersedes it. */
    "supersededBy"?: SchemaValue<Class | Enumeration | Property | IdReference, "supersededBy">;
}
interface EnumerationLeaf extends EnumerationBase {
    "@type": "Enumeration";
}
/** Lists or enumerations—for example, a list of cuisines or music genres, etc. */
export type Enumeration = EnumerationLeaf | AdultOrientedEnumeration | BoardingPolicyType | BookFormatType | BusinessEntityType | BusinessFunction | CarUsageType | CertificationStatusEnumeration | ContactPointOption | DayOfWeek | DeliveryMethod | DigitalDocumentPermissionType | DigitalPlatformEnumeration | EnergyEfficiencyEnumeration | EventAttendanceModeEnumeration | GameAvailabilityEnumeration | GamePlayMode | GenderType | GovernmentBenefitsType | HealthAspectEnumeration | ItemAvailability | ItemListOrderType | LegalValueLevel | MapCategoryType | MeasurementMethodEnum | MeasurementTypeEnumeration | MediaEnumeration | MediaManipulationRatingEnumeration | MedicalEnumeration | MerchantReturnEnumeration | MusicAlbumProductionType | MusicAlbumReleaseType | MusicReleaseFormatType | NonprofitType | OfferItemCondition | PaymentMethodType | PhysicalActivityCategory | PriceComponentTypeEnumeration | PriceTypeEnumeration | ProductReturnEnumeration | QualitativeValue | RefundTypeEnumeration | RestrictedDiet | ReturnFeesEnumeration | ReturnLabelSourceEnumeration | ReturnMethodEnumeration | RsvpResponseType | SizeGroupEnumeration | SizeSystemEnumeration | Specialty | StatusEnumeration | TierBenefitEnumeration | WarrantyScope;
interface EpisodeBase extends CreativeWorkBase {
    /** An actor (individual or a group), e.g. in TV, radio, movie, video games etc., or in an event. Actors can be associated with individual items or with a series, episode, clip. */
    "actor"?: SchemaValue<PerformingGroup | Person | IdReference, "actor">;
    /**
     * An actor, e.g. in TV, radio, movie, video games etc. Actors can be associated with individual items or with a series, episode, clip.
     *
     * @deprecated Consider using https://schema.org/actor instead.
     */
    "actors"?: SchemaValue<Person | IdReference, "actors">;
    /** A director of e.g. TV, radio, movie, video gaming etc. content, or of an event. Directors can be associated with individual items or with a series, episode, clip. */
    "director"?: SchemaValue<Person | IdReference, "director">;
    /**
     * A director of e.g. TV, radio, movie, video games etc. content. Directors can be associated with individual items or with a series, episode, clip.
     *
     * @deprecated Consider using https://schema.org/director instead.
     */
    "directors"?: SchemaValue<Person | IdReference, "directors">;
    /** The duration of the item (movie, audio recording, event, etc.) in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 duration format}. */
    "duration"?: SchemaValue<Duration | IdReference, "duration">;
    /** Position of the episode within an ordered group of episodes. */
    "episodeNumber"?: SchemaValue<Integer | Text, "episodeNumber">;
    /** The composer of the soundtrack. */
    "musicBy"?: SchemaValue<MusicGroup | Person | IdReference, "musicBy">;
    /** The season to which this episode belongs. */
    "partOfSeason"?: SchemaValue<CreativeWorkSeason | IdReference, "partOfSeason">;
    /** The series to which this episode or season belongs. */
    "partOfSeries"?: SchemaValue<CreativeWorkSeries | IdReference, "partOfSeries">;
    /** The production company or studio responsible for the item, e.g. series, video game, episode etc. */
    "productionCompany"?: SchemaValue<Organization | IdReference, "productionCompany">;
    /** The trailer of a movie or TV/radio series, season, episode, etc. */
    "trailer"?: SchemaValue<VideoObject | IdReference, "trailer">;
}
interface EpisodeLeaf extends EpisodeBase {
    "@type": "Episode";
}
/** A media episode (e.g. TV, radio, video game) which can be part of a series or season. */
export type Episode = EpisodeLeaf | PodcastEpisode | RadioEpisode | TVEpisode;
interface EUEnergyEfficiencyEnumerationLeaf extends EnumerationBase {
    "@type": "EUEnergyEfficiencyEnumeration";
}
/** Enumerates the EU energy efficiency classes A-G as well as A+, A++, and A+++ as defined in EU directive 2017/1369. */
export type EUEnergyEfficiencyEnumeration = "https://schema.org/EUEnergyEfficiencyCategoryA" | "EUEnergyEfficiencyCategoryA" | "https://schema.org/EUEnergyEfficiencyCategoryA1Plus" | "EUEnergyEfficiencyCategoryA1Plus" | "https://schema.org/EUEnergyEfficiencyCategoryA2Plus" | "EUEnergyEfficiencyCategoryA2Plus" | "https://schema.org/EUEnergyEfficiencyCategoryA3Plus" | "EUEnergyEfficiencyCategoryA3Plus" | "https://schema.org/EUEnergyEfficiencyCategoryB" | "EUEnergyEfficiencyCategoryB" | "https://schema.org/EUEnergyEfficiencyCategoryC" | "EUEnergyEfficiencyCategoryC" | "https://schema.org/EUEnergyEfficiencyCategoryD" | "EUEnergyEfficiencyCategoryD" | "https://schema.org/EUEnergyEfficiencyCategoryE" | "EUEnergyEfficiencyCategoryE" | "https://schema.org/EUEnergyEfficiencyCategoryF" | "EUEnergyEfficiencyCategoryF" | "https://schema.org/EUEnergyEfficiencyCategoryG" | "EUEnergyEfficiencyCategoryG" | EUEnergyEfficiencyEnumerationLeaf;
interface EventBase extends ThingBase {
    /** The subject matter of the content. */
    "about"?: SchemaValue<Thing | IdReference, "about">;
    /** An actor (individual or a group), e.g. in TV, radio, movie, video games etc., or in an event. Actors can be associated with individual items or with a series, episode, clip. */
    "actor"?: SchemaValue<PerformingGroup | Person | IdReference, "actor">;
    /** The overall rating, based on a collection of reviews or ratings, of the item. */
    "aggregateRating"?: SchemaValue<AggregateRating | IdReference, "aggregateRating">;
    /** A person or organization attending the event. */
    "attendee"?: SchemaValue<Organization | Person | IdReference, "attendee">;
    /**
     * A person attending the event.
     *
     * @deprecated Consider using https://schema.org/attendee instead.
     */
    "attendees"?: SchemaValue<Organization | Person | IdReference, "attendees">;
    /** An intended audience, i.e. a group for whom something was created. */
    "audience"?: SchemaValue<Audience | IdReference, "audience">;
    /** The person or organization who wrote a composition, or who is the composer of a work performed at some event. */
    "composer"?: SchemaValue<Organization | Person | IdReference, "composer">;
    /** A secondary contributor to the CreativeWork or Event. */
    "contributor"?: SchemaValue<Organization | Person | IdReference, "contributor">;
    /** A director of e.g. TV, radio, movie, video gaming etc. content, or of an event. Directors can be associated with individual items or with a series, episode, clip. */
    "director"?: SchemaValue<Person | IdReference, "director">;
    /** The time admission will commence. */
    "doorTime"?: SchemaValue<DateTime | Time, "doorTime">;
    /** The duration of the item (movie, audio recording, event, etc.) in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 duration format}. */
    "duration"?: SchemaValue<Duration | IdReference, "duration">;
    /** The end date and time of the item (in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 date format}). */
    "endDate"?: SchemaValue<Date | DateTime, "endDate">;
    /** The eventAttendanceMode of an event indicates whether it occurs online, offline, or a mix. */
    "eventAttendanceMode"?: SchemaValue<EventAttendanceModeEnumeration | IdReference, "eventAttendanceMode">;
    /** Associates an {@link https://schema.org/Event Event} with a {@link https://schema.org/Schedule Schedule}. There are circumstances where it is preferable to share a schedule for a series of repeating events rather than data on the individual events themselves. For example, a website or application might prefer to publish a schedule for a weekly gym class rather than provide data on every event. A schedule could be processed by applications to add forthcoming events to a calendar. An {@link https://schema.org/Event Event} that is associated with a {@link https://schema.org/Schedule Schedule} using this property should not have {@link https://schema.org/startDate startDate} or {@link https://schema.org/endDate endDate} properties. These are instead defined within the associated {@link https://schema.org/Schedule Schedule}, this avoids any ambiguity for clients using the data. The property might have repeated values to specify different schedules, e.g. for different months or seasons. */
    "eventSchedule"?: SchemaValue<Schedule | IdReference, "eventSchedule">;
    /** An eventStatus of an event represents its status; particularly useful when an event is cancelled or rescheduled. */
    "eventStatus"?: SchemaValue<EventStatusType | IdReference, "eventStatus">;
    /** A person or organization that supports (sponsors) something through some kind of financial contribution. */
    "funder"?: SchemaValue<Organization | Person | IdReference, "funder">;
    /** A {@link https://schema.org/Grant Grant} that directly or indirectly provide funding or sponsorship for this item. See also {@link https://schema.org/ownershipFundingInfo ownershipFundingInfo}. */
    "funding"?: SchemaValue<Grant | IdReference, "funding">;
    /** The language of the content or performance or used in an action. Please use one of the language codes from the {@link http://tools.ietf.org/html/bcp47 IETF BCP 47 standard}. See also {@link https://schema.org/availableLanguage availableLanguage}. */
    "inLanguage"?: SchemaValue<Language | Text | IdReference, "inLanguage">;
    /** A flag to signal that the item, event, or place is accessible for free. */
    "isAccessibleForFree"?: SchemaValue<Boolean, "isAccessibleForFree">;
    /** Keywords or tags used to describe some item. Multiple textual entries in a keywords list are typically delimited by commas, or by repeating the property. */
    "keywords"?: SchemaValue<DefinedTerm | Text | URL | IdReference, "keywords">;
    /** The location of, for example, where an event is happening, where an organization is located, or where an action takes place. */
    "location"?: SchemaValue<Place | PostalAddress | Text | VirtualLocation | IdReference, "location">;
    /** The total number of individuals that may attend an event or venue. */
    "maximumAttendeeCapacity"?: SchemaValue<Integer, "maximumAttendeeCapacity">;
    /** The maximum physical attendee capacity of an {@link https://schema.org/Event Event} whose {@link https://schema.org/eventAttendanceMode eventAttendanceMode} is {@link https://schema.org/OfflineEventAttendanceMode OfflineEventAttendanceMode} (or the offline aspects, in the case of a {@link https://schema.org/MixedEventAttendanceMode MixedEventAttendanceMode}). */
    "maximumPhysicalAttendeeCapacity"?: SchemaValue<Integer, "maximumPhysicalAttendeeCapacity">;
    /** The maximum virtual attendee capacity of an {@link https://schema.org/Event Event} whose {@link https://schema.org/eventAttendanceMode eventAttendanceMode} is {@link https://schema.org/OnlineEventAttendanceMode OnlineEventAttendanceMode} (or the online aspects, in the case of a {@link https://schema.org/MixedEventAttendanceMode MixedEventAttendanceMode}). */
    "maximumVirtualAttendeeCapacity"?: SchemaValue<Integer, "maximumVirtualAttendeeCapacity">;
    /** An offer to provide this item—for example, an offer to sell a product, rent the DVD of a movie, perform a service, or give away tickets to an event. Use {@link https://schema.org/businessFunction businessFunction} to indicate the kind of transaction offered, i.e. sell, lease, etc. This property can also be used to describe a {@link https://schema.org/Demand Demand}. While this property is listed as expected on a number of common types, it can be used in others. In that case, using a second type, such as Product or a subtype of Product, can clarify the nature of the offer. */
    "offers"?: SchemaValue<Demand | Offer | IdReference, "offers">;
    /** An organizer of an Event. */
    "organizer"?: SchemaValue<Organization | Person | IdReference, "organizer">;
    /** A performer at the event—for example, a presenter, musician, musical group or actor. */
    "performer"?: SchemaValue<Organization | Person | IdReference, "performer">;
    /**
     * The main performer or performers of the event—for example, a presenter, musician, or actor.
     *
     * @deprecated Consider using https://schema.org/performer instead.
     */
    "performers"?: SchemaValue<Organization | Person | IdReference, "performers">;
    /** Used in conjunction with eventStatus for rescheduled or cancelled events. This property contains the previously scheduled start date. For rescheduled events, the startDate property should be used for the newly scheduled start date. In the (rare) case of an event that has been postponed and rescheduled multiple times, this field may be repeated. */
    "previousStartDate"?: SchemaValue<Date, "previousStartDate">;
    /** The CreativeWork that captured all or part of this Event. */
    "recordedIn"?: SchemaValue<CreativeWork | IdReference, "recordedIn">;
    /** The number of attendee places for an event that remain unallocated. */
    "remainingAttendeeCapacity"?: SchemaValue<Integer, "remainingAttendeeCapacity">;
    /** A review of the item. */
    "review"?: SchemaValue<Review | IdReference, "review">;
    /** A person or organization that supports a thing through a pledge, promise, or financial contribution. E.g. a sponsor of a Medical Study or a corporate sponsor of an event. */
    "sponsor"?: SchemaValue<Organization | Person | IdReference, "sponsor">;
    /** The start date and time of the item (in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 date format}). */
    "startDate"?: SchemaValue<Date | DateTime, "startDate">;
    /** An Event that is part of this event. For example, a conference event includes many presentations, each of which is a subEvent of the conference. */
    "subEvent"?: SchemaValue<Event | IdReference, "subEvent">;
    /**
     * Events that are a part of this event. For example, a conference event includes many presentations, each subEvents of the conference.
     *
     * @deprecated Consider using https://schema.org/subEvent instead.
     */
    "subEvents"?: SchemaValue<Event | IdReference, "subEvents">;
    /** An event that this event is a part of. For example, a collection of individual music performances might each have a music festival as their superEvent. */
    "superEvent"?: SchemaValue<Event | IdReference, "superEvent">;
    /** Organization or person who adapts a creative work to different languages, regional differences and technical requirements of a target market, or that translates during some event. */
    "translator"?: SchemaValue<Organization | Person | IdReference, "translator">;
    /** The typical expected age range, e.g. '7-9', '11-'. */
    "typicalAgeRange"?: SchemaValue<Text, "typicalAgeRange">;
    /** A work featured in some event, e.g. exhibited in an ExhibitionEvent. Specific subproperties are available for workPerformed (e.g. a play), or a workPresented (a Movie at a ScreeningEvent). */
    "workFeatured"?: SchemaValue<CreativeWork | IdReference, "workFeatured">;
    /** A work performed in some event, for example a play performed in a TheaterEvent. */
    "workPerformed"?: SchemaValue<CreativeWork | IdReference, "workPerformed">;
}
interface EventLeaf extends EventBase {
    "@type": "Event";
}
/** An event happening at a certain time and location, such as a concert, lecture, or festival. Ticketing information may be added via the {@link https://schema.org/offers offers} property. Repeated events may be structured as separate Event objects. */
export type Event = EventLeaf | BusinessEvent | ChildrensEvent | ComedyEvent | CourseInstance | DanceEvent | DeliveryEvent | EducationEvent | EventSeries | ExhibitionEvent | Festival | FoodEvent | Hackathon | LiteraryEvent | MusicEvent | PublicationEvent | SaleEvent | ScreeningEvent | SocialEvent | SportsEvent | TheaterEvent | UserInteraction | VisualArtsEvent;
interface EventAttendanceModeEnumerationLeaf extends EnumerationBase {
    "@type": "EventAttendanceModeEnumeration";
}
/** An EventAttendanceModeEnumeration value is one of potentially several modes of organising an event, relating to whether it is online or offline. */
export type EventAttendanceModeEnumeration = "https://schema.org/MixedEventAttendanceMode" | "MixedEventAttendanceMode" | "https://schema.org/OfflineEventAttendanceMode" | "OfflineEventAttendanceMode" | "https://schema.org/OnlineEventAttendanceMode" | "OnlineEventAttendanceMode" | EventAttendanceModeEnumerationLeaf;
interface EventReservationLeaf extends ReservationBase {
    "@type": "EventReservation";
}
/**
 * A reservation for an event like a concert, sporting event, or lecture.
 *
 * Note: This type is for information about actual reservations, e.g. in confirmation emails or HTML pages with individual confirmations of reservations. For offers of tickets, use {@link https://schema.org/Offer Offer}.
 */
export type EventReservation = EventReservationLeaf;
interface EventSeriesBase extends EventBase, ThingBase {
}
interface EventSeriesLeaf extends EventSeriesBase {
    "@type": "EventSeries";
}
/**
 * A series of {@link https://schema.org/Event Event}s. Included events can relate with the series using the {@link https://schema.org/superEvent superEvent} property.
 *
 * An EventSeries is a collection of events that share some unifying characteristic. For example, "The Olympic Games" is a series, which is repeated regularly. The "2012 London Olympics" can be presented both as an {@link https://schema.org/Event Event} in the series "Olympic Games", and as an {@link https://schema.org/EventSeries EventSeries} that included a number of sporting competitions as Events.
 *
 * The nature of the association between the events in an {@link https://schema.org/EventSeries EventSeries} can vary, but typical examples could include a thematic event series (e.g. topical meetups or classes), or a series of regular events that share a location, attendee group and/or organizers.
 *
 * EventSeries has been defined as a kind of Event to make it easy for publishers to use it in an Event context without worrying about which kinds of series are really event-like enough to call an Event. In general an EventSeries may seem more Event-like when the period of time is compact and when aspects such as location are fixed, but it may also sometimes prove useful to describe a longer-term series as an Event.
 */
export type EventSeries = EventSeriesLeaf;
interface EventStatusTypeLeaf extends EnumerationBase {
    "@type": "EventStatusType";
}
/** EventStatusType is an enumeration type whose instances represent several states that an Event may be in. */
export type EventStatusType = "https://schema.org/EventCancelled" | "EventCancelled" | "https://schema.org/EventMovedOnline" | "EventMovedOnline" | "https://schema.org/EventPostponed" | "EventPostponed" | "https://schema.org/EventRescheduled" | "EventRescheduled" | "https://schema.org/EventScheduled" | "EventScheduled" | EventStatusTypeLeaf;
interface EventVenueLeaf extends CivicStructureBase {
    "@type": "EventVenue";
}
/** An event venue. */
export type EventVenue = EventVenueLeaf | string;
interface ExchangeRateSpecificationBase extends ThingBase {
    /**
     * The currency in which the monetary amount is expressed.
     *
     * Use standard formats: {@link http://en.wikipedia.org/wiki/ISO_4217 ISO 4217 currency format}, e.g. "USD"; {@link https://en.wikipedia.org/wiki/List_of_cryptocurrencies Ticker symbol} for cryptocurrencies, e.g. "BTC"; well known names for {@link https://en.wikipedia.org/wiki/Local_exchange_trading_system Local Exchange Trading Systems} (LETS) and other currency types, e.g. "Ithaca HOUR".
     */
    "currency"?: SchemaValue<Text, "currency">;
    /** The current price of a currency. */
    "currentExchangeRate"?: SchemaValue<UnitPriceSpecification | IdReference, "currentExchangeRate">;
    /** The difference between the price at which a broker or other intermediary buys and sells foreign currency. */
    "exchangeRateSpread"?: SchemaValue<MonetaryAmount | Number | IdReference, "exchangeRateSpread">;
}
interface ExchangeRateSpecificationLeaf extends ExchangeRateSpecificationBase {
    "@type": "ExchangeRateSpecification";
}
/** A structured value representing exchange rate. */
export type ExchangeRateSpecification = ExchangeRateSpecificationLeaf;
interface ExerciseActionBase extends PlayActionBase {
    /**
     * A sub property of location. The course where this action was taken.
     *
     * @deprecated Consider using https://schema.org/exerciseCourse instead.
     */
    "course"?: SchemaValue<Place | IdReference, "course">;
    /** A sub property of instrument. The diet used in this action. */
    "diet"?: SchemaValue<Diet | IdReference, "diet">;
    /** The distance travelled, e.g. exercising or travelling. */
    "distance"?: SchemaValue<Distance | IdReference, "distance">;
    /** A sub property of location. The course where this action was taken. */
    "exerciseCourse"?: SchemaValue<Place | IdReference, "exerciseCourse">;
    /** A sub property of instrument. The exercise plan used on this action. */
    "exercisePlan"?: SchemaValue<ExercisePlan | IdReference, "exercisePlan">;
    /** A sub property of instrument. The diet used in this action. */
    "exerciseRelatedDiet"?: SchemaValue<Diet | IdReference, "exerciseRelatedDiet">;
    /** Type(s) of exercise or activity, such as strength training, flexibility training, aerobics, cardiac rehabilitation, etc. */
    "exerciseType"?: SchemaValue<Text, "exerciseType">;
    /** A sub property of location. The original location of the object or the agent before the action. */
    "fromLocation"?: SchemaValue<Place | IdReference, "fromLocation">;
    /** A sub property of participant. The opponent on this action. */
    "opponent"?: SchemaValue<Person | IdReference, "opponent">;
    /** A sub property of location. The sports activity location where this action occurred. */
    "sportsActivityLocation"?: SchemaValue<SportsActivityLocation | IdReference, "sportsActivityLocation">;
    /** A sub property of location. The sports event where this action occurred. */
    "sportsEvent"?: SchemaValue<SportsEvent | IdReference, "sportsEvent">;
    /** A sub property of participant. The sports team that participated on this action. */
    "sportsTeam"?: SchemaValue<SportsTeam | IdReference, "sportsTeam">;
    /** A sub property of location. The final location of the object or the agent after the action. */
    "toLocation"?: SchemaValue<Place | IdReference, "toLocation">;
}
interface ExerciseActionLeaf extends ExerciseActionBase {
    "@type": "ExerciseAction";
}
/** The act of participating in exertive activity for the purposes of improving health and fitness. */
export type ExerciseAction = ExerciseActionLeaf;
interface ExerciseGymLeaf extends LocalBusinessBase {
    "@type": "ExerciseGym";
}
/** A gym. */
export type ExerciseGym = ExerciseGymLeaf | string;
interface ExercisePlanBase extends CreativeWorkBase, PhysicalActivityBase {
    /** Length of time to engage in the activity. */
    "activityDuration"?: SchemaValue<Duration | QuantitativeValue | IdReference, "activityDuration">;
    /** How often one should engage in the activity. */
    "activityFrequency"?: SchemaValue<QuantitativeValue | Text | IdReference, "activityFrequency">;
    /** Any additional component of the exercise prescription that may need to be articulated to the patient. This may include the order of exercises, the number of repetitions of movement, quantitative distance, progressions over time, etc. */
    "additionalVariable"?: SchemaValue<Text, "additionalVariable">;
    /** Type(s) of exercise or activity, such as strength training, flexibility training, aerobics, cardiac rehabilitation, etc. */
    "exerciseType"?: SchemaValue<Text, "exerciseType">;
    /** Quantitative measure gauging the degree of force involved in the exercise, for example, heartbeats per minute. May include the velocity of the movement. */
    "intensity"?: SchemaValue<QuantitativeValue | Text | IdReference, "intensity">;
    /** Number of times one should repeat the activity. */
    "repetitions"?: SchemaValue<Number | QuantitativeValue | IdReference, "repetitions">;
    /** How often one should break from the activity. */
    "restPeriods"?: SchemaValue<QuantitativeValue | Text | IdReference, "restPeriods">;
    /** Quantitative measure of the physiologic output of the exercise; also referred to as energy expenditure. */
    "workload"?: SchemaValue<Energy | QuantitativeValue | IdReference, "workload">;
}
interface ExercisePlanLeaf extends ExercisePlanBase {
    "@type": "ExercisePlan";
}
/** Fitness-related activity designed for a specific health-related purpose, including defined exercise routines as well as activity prescribed by a clinician. */
export type ExercisePlan = ExercisePlanLeaf;
interface ExhibitionEventLeaf extends EventBase {
    "@type": "ExhibitionEvent";
}
/** Event type: Exhibition event, e.g. at a museum, library, archive, tradeshow, ... */
export type ExhibitionEvent = ExhibitionEventLeaf;
interface FAQPageLeaf extends WebPageBase {
    "@type": "FAQPage";
}
/** A {@link https://schema.org/FAQPage FAQPage} is a {@link https://schema.org/WebPage WebPage} presenting one or more "{@link https://en.wikipedia.org/wiki/FAQ Frequently asked questions}" (see also {@link https://schema.org/QAPage QAPage}). */
export type FAQPage = FAQPageLeaf;
interface FastFoodRestaurantLeaf extends FoodEstablishmentBase {
    "@type": "FastFoodRestaurant";
}
/** A fast-food restaurant. */
export type FastFoodRestaurant = FastFoodRestaurantLeaf | string;
interface FestivalLeaf extends EventBase {
    "@type": "Festival";
}
/** Event type: Festival. */
export type Festival = FestivalLeaf;
interface FilmActionLeaf extends ActionBase {
    "@type": "FilmAction";
}
/** The act of capturing sound and moving images on film, video, or digitally. */
export type FilmAction = FilmActionLeaf;
interface FinancialProductBase extends ServiceBase {
    /** The annual rate that is charged for borrowing (or made by investing), expressed as a single percentage number that represents the actual yearly cost of funds over the term of a loan. This includes any fees or additional costs associated with the transaction. */
    "annualPercentageRate"?: SchemaValue<Number | QuantitativeValue | IdReference, "annualPercentageRate">;
    /** Description of fees, commissions, and other terms applied either to a class of financial product, or by a financial service organization. */
    "feesAndCommissionsSpecification"?: SchemaValue<Text | URL, "feesAndCommissionsSpecification">;
    /** The interest rate, charged or paid, applicable to the financial product. Note: This is different from the calculated annualPercentageRate. */
    "interestRate"?: SchemaValue<Number | QuantitativeValue | IdReference, "interestRate">;
}
interface FinancialProductLeaf extends FinancialProductBase {
    "@type": "FinancialProduct";
}
/** A product provided to consumers and businesses by financial institutions such as banks, insurance companies, brokerage firms, consumer finance companies, and investment companies which comprise the financial services industry. */
export type FinancialProduct = FinancialProductLeaf | BankAccount | CurrencyConversionService | InvestmentOrDeposit | LoanOrCredit | PaymentCard | PaymentService;
interface FinancialServiceBase extends LocalBusinessBase {
    /** Description of fees, commissions, and other terms applied either to a class of financial product, or by a financial service organization. */
    "feesAndCommissionsSpecification"?: SchemaValue<Text | URL, "feesAndCommissionsSpecification">;
}
interface FinancialServiceLeaf extends FinancialServiceBase {
    "@type": "FinancialService";
}
/** Financial services business. */
export type FinancialService = FinancialServiceLeaf | AccountingService | AutomatedTeller | BankOrCreditUnion | InsuranceAgency | string;
interface FindActionLeaf extends ActionBase {
    "@type": "FindAction";
}
/**
 * The act of finding an object.
 *
 * Related actions:
 * - {@link https://schema.org/SearchAction SearchAction}: FindAction is generally lead by a SearchAction, but not necessarily.
 */
export type FindAction = FindActionLeaf | CheckAction | DiscoverAction | TrackAction;
interface FireStationBase extends CivicStructureBase, LocalBusinessBase {
}
interface FireStationLeaf extends FireStationBase {
    "@type": "FireStation";
}
/** A fire station. With firemen. */
export type FireStation = FireStationLeaf | string;
interface FlightBase extends TripBase {
    /** The kind of aircraft (e.g., "Boeing 747"). */
    "aircraft"?: SchemaValue<Text | Vehicle | IdReference, "aircraft">;
    /** The airport where the flight terminates. */
    "arrivalAirport"?: SchemaValue<Airport | IdReference, "arrivalAirport">;
    /** Identifier of the flight's arrival gate. */
    "arrivalGate"?: SchemaValue<Text, "arrivalGate">;
    /** Identifier of the flight's arrival terminal. */
    "arrivalTerminal"?: SchemaValue<Text, "arrivalTerminal">;
    /** The type of boarding policy used by the airline (e.g. zone-based or group-based). */
    "boardingPolicy"?: SchemaValue<BoardingPolicyType | IdReference, "boardingPolicy">;
    /**
     * 'carrier' is an out-dated term indicating the 'provider' for parcel delivery and flights.
     *
     * @deprecated Consider using https://schema.org/provider instead.
     */
    "carrier"?: SchemaValue<Organization | IdReference, "carrier">;
    /** The airport where the flight originates. */
    "departureAirport"?: SchemaValue<Airport | IdReference, "departureAirport">;
    /** Identifier of the flight's departure gate. */
    "departureGate"?: SchemaValue<Text, "departureGate">;
    /** Identifier of the flight's departure terminal. */
    "departureTerminal"?: SchemaValue<Text, "departureTerminal">;
    /** The estimated time the flight will take. */
    "estimatedFlightDuration"?: SchemaValue<Duration | Text | IdReference, "estimatedFlightDuration">;
    /** The distance of the flight. */
    "flightDistance"?: SchemaValue<Distance | Text | IdReference, "flightDistance">;
    /** The unique identifier for a flight including the airline IATA code. For example, if describing United flight 110, where the IATA code for United is 'UA', the flightNumber is 'UA110'. */
    "flightNumber"?: SchemaValue<Text, "flightNumber">;
    /** Description of the meals that will be provided or available for purchase. */
    "mealService"?: SchemaValue<Text, "mealService">;
    /** An entity which offers (sells / leases / lends / loans) the services / goods. A seller may also be a provider. */
    "seller"?: SchemaValue<Organization | Person | IdReference, "seller">;
    /** The time when a passenger can check into the flight online. */
    "webCheckinTime"?: SchemaValue<DateTime, "webCheckinTime">;
}
interface FlightLeaf extends FlightBase {
    "@type": "Flight";
}
/** An airline flight. */
export type Flight = FlightLeaf;
interface FlightReservationBase extends ReservationBase {
    /** The airline-specific indicator of boarding order / preference. */
    "boardingGroup"?: SchemaValue<Text, "boardingGroup">;
    /** The priority status assigned to a passenger for security or boarding (e.g. FastTrack or Priority). */
    "passengerPriorityStatus"?: SchemaValue<QualitativeValue | Text | IdReference, "passengerPriorityStatus">;
    /** The passenger's sequence number as assigned by the airline. */
    "passengerSequenceNumber"?: SchemaValue<Text, "passengerSequenceNumber">;
    /** The type of security screening the passenger is subject to. */
    "securityScreening"?: SchemaValue<Text, "securityScreening">;
}
interface FlightReservationLeaf extends FlightReservationBase {
    "@type": "FlightReservation";
}
/**
 * A reservation for air travel.
 *
 * Note: This type is for information about actual reservations, e.g. in confirmation emails or HTML pages with individual confirmations of reservations. For offers of tickets, use {@link https://schema.org/Offer Offer}.
 */
export type FlightReservation = FlightReservationLeaf;
/** Data type: Floating number. */
export type Float = number | `${number}`;
interface FloorPlanBase extends ThingBase {
    /** An amenity feature (e.g. a characteristic or service) of the Accommodation. This generic property does not make a statement about whether the feature is included in an offer for the main accommodation or available at extra costs. */
    "amenityFeature"?: SchemaValue<LocationFeatureSpecification | IdReference, "amenityFeature">;
    /** The size of the accommodation, e.g. in square meter or squarefoot. Typical unit code(s): MTK for square meter, FTK for square foot, or YDK for square yard. */
    "floorSize"?: SchemaValue<QuantitativeValue | IdReference, "floorSize">;
    /** Indicates some accommodation that this floor plan describes. */
    "isPlanForApartment"?: SchemaValue<Accommodation | IdReference, "isPlanForApartment">;
    /** A schematic image showing the floorplan layout. */
    "layoutImage"?: SchemaValue<ImageObject | URL | IdReference, "layoutImage">;
    /** Indicates the total (available plus unavailable) number of accommodation units in an {@link https://schema.org/ApartmentComplex ApartmentComplex}, or the number of accommodation units for a specific {@link https://schema.org/FloorPlan FloorPlan} (within its specific {@link https://schema.org/ApartmentComplex ApartmentComplex}). See also {@link https://schema.org/numberOfAvailableAccommodationUnits numberOfAvailableAccommodationUnits}. */
    "numberOfAccommodationUnits"?: SchemaValue<QuantitativeValue | IdReference, "numberOfAccommodationUnits">;
    /** Indicates the number of available accommodation units in an {@link https://schema.org/ApartmentComplex ApartmentComplex}, or the number of accommodation units for a specific {@link https://schema.org/FloorPlan FloorPlan} (within its specific {@link https://schema.org/ApartmentComplex ApartmentComplex}). See also {@link https://schema.org/numberOfAccommodationUnits numberOfAccommodationUnits}. */
    "numberOfAvailableAccommodationUnits"?: SchemaValue<QuantitativeValue | IdReference, "numberOfAvailableAccommodationUnits">;
    /** The total integer number of bathrooms in some {@link https://schema.org/Accommodation Accommodation}, following real estate conventions as {@link https://ddwiki.reso.org/display/DDW17/BathroomsTotalInteger+Field documented in RESO}: "The simple sum of the number of bathrooms. For example for a property with two Full Bathrooms and one Half Bathroom, the Bathrooms Total Integer will be 3.". See also {@link https://schema.org/numberOfRooms numberOfRooms}. */
    "numberOfBathroomsTotal"?: SchemaValue<Integer, "numberOfBathroomsTotal">;
    /** The total integer number of bedrooms in a some {@link https://schema.org/Accommodation Accommodation}, {@link https://schema.org/ApartmentComplex ApartmentComplex} or {@link https://schema.org/FloorPlan FloorPlan}. */
    "numberOfBedrooms"?: SchemaValue<Number | QuantitativeValue | IdReference, "numberOfBedrooms">;
    /** Number of full bathrooms - The total number of full and ¾ bathrooms in an {@link https://schema.org/Accommodation Accommodation}. This corresponds to the {@link https://ddwiki.reso.org/display/DDW17/BathroomsFull+Field BathroomsFull field in RESO}. */
    "numberOfFullBathrooms"?: SchemaValue<Number, "numberOfFullBathrooms">;
    /** Number of partial bathrooms - The total number of half and ¼ bathrooms in an {@link https://schema.org/Accommodation Accommodation}. This corresponds to the {@link https://ddwiki.reso.org/display/DDW17/BathroomsPartial+Field BathroomsPartial field in RESO}. */
    "numberOfPartialBathrooms"?: SchemaValue<Number, "numberOfPartialBathrooms">;
    /** The number of rooms (excluding bathrooms and closets) of the accommodation or lodging business. Typical unit code(s): ROM for room or C62 for no unit. The type of room can be put in the unitText property of the QuantitativeValue. */
    "numberOfRooms"?: SchemaValue<Number | QuantitativeValue | IdReference, "numberOfRooms">;
    /** Indicates whether pets are allowed to enter the accommodation or lodging business. More detailed information can be put in a text value. */
    "petsAllowed"?: SchemaValue<Boolean | Text, "petsAllowed">;
}
interface FloorPlanLeaf extends FloorPlanBase {
    "@type": "FloorPlan";
}
/** A FloorPlan is an explicit representation of a collection of similar accommodations, allowing the provision of common information (room counts, sizes, layout diagrams) and offers for rental or sale. In typical use, some {@link https://schema.org/ApartmentComplex ApartmentComplex} has an {@link https://schema.org/accommodationFloorPlan accommodationFloorPlan} which is a {@link https://schema.org/FloorPlan FloorPlan}. A FloorPlan is always in the context of a particular place, either a larger {@link https://schema.org/ApartmentComplex ApartmentComplex} or a single {@link https://schema.org/Apartment Apartment}. The visual/spatial aspects of a floor plan (i.e. room layout, {@link https://en.wikipedia.org/wiki/Floor_plan see wikipedia}) can be indicated using {@link https://schema.org/image image}. */
export type FloorPlan = FloorPlanLeaf;
interface FloristLeaf extends LocalBusinessBase {
    "@type": "Florist";
}
/** A florist. */
export type Florist = FloristLeaf | string;
interface FMRadioChannelLeaf extends BroadcastChannelBase {
    "@type": "FMRadioChannel";
}
/** A radio channel that uses FM. */
export type FMRadioChannel = FMRadioChannelLeaf;
interface FollowActionBase extends ActionBase {
    /** A sub property of object. The person or organization being followed. */
    "followee"?: SchemaValue<Organization | Person | IdReference, "followee">;
}
interface FollowActionLeaf extends FollowActionBase {
    "@type": "FollowAction";
}
/**
 * The act of forming a personal connection with someone/something (object) unidirectionally/asymmetrically to get updates polled from.
 *
 * Related actions:
 * - {@link https://schema.org/BefriendAction BefriendAction}: Unlike BefriendAction, FollowAction implies that the connection is _not_ necessarily reciprocal.
 * - {@link https://schema.org/SubscribeAction SubscribeAction}: Unlike SubscribeAction, FollowAction implies that the follower acts as an active agent constantly/actively polling for updates.
 * - {@link https://schema.org/RegisterAction RegisterAction}: Unlike RegisterAction, FollowAction implies that the agent is interested in continuing receiving updates from the object.
 * - {@link https://schema.org/JoinAction JoinAction}: Unlike JoinAction, FollowAction implies that the agent is interested in getting updates from the object.
 * - {@link https://schema.org/TrackAction TrackAction}: Unlike TrackAction, FollowAction refers to the polling of updates of all aspects of animate objects rather than the location of inanimate objects (e.g. you track a package, but you don't follow it).
 */
export type FollowAction = FollowActionLeaf;
interface FoodEstablishmentBase extends LocalBusinessBase {
    /** Indicates whether a FoodEstablishment accepts reservations. Values can be Boolean, an URL at which reservations can be made or (for backwards compatibility) the strings `Yes` or `No`. */
    "acceptsReservations"?: SchemaValue<Boolean | Text | URL, "acceptsReservations">;
    /** Either the actual menu as a structured representation, as text, or a URL of the menu. */
    "hasMenu"?: SchemaValue<Menu | Text | URL | IdReference, "hasMenu">;
    /**
     * Either the actual menu as a structured representation, as text, or a URL of the menu.
     *
     * @deprecated Consider using https://schema.org/hasMenu instead.
     */
    "menu"?: SchemaValue<Menu | Text | URL | IdReference, "menu">;
    /** The cuisine of the restaurant. */
    "servesCuisine"?: SchemaValue<Text, "servesCuisine">;
    /** An official rating for a lodging business or food establishment, e.g. from national associations or standards bodies. Use the author property to indicate the rating organization, e.g. as an Organization with name such as (e.g. HOTREC, DEHOGA, WHR, or Hotelstars). */
    "starRating"?: SchemaValue<Rating | IdReference, "starRating">;
}
interface FoodEstablishmentLeaf extends FoodEstablishmentBase {
    "@type": "FoodEstablishment";
}
/** A food-related business. */
export type FoodEstablishment = FoodEstablishmentLeaf | Bakery | BarOrPub | Brewery | CafeOrCoffeeShop | Distillery | FastFoodRestaurant | IceCreamShop | Restaurant | Winery | string;
interface FoodEstablishmentReservationBase extends ReservationBase {
    /**
     * The endTime of something. For a reserved event or service (e.g. FoodEstablishmentReservation), the time that it is expected to end. For actions that span a period of time, when the action was performed. E.g. John wrote a book from January to _December_. For media, including audio and video, it's the time offset of the end of a clip within a larger file.
     *
     * Note that Event uses startDate/endDate instead of startTime/endTime, even when describing dates with times. This situation may be clarified in future revisions.
     */
    "endTime"?: SchemaValue<DateTime | Time, "endTime">;
    /** Number of people the reservation should accommodate. */
    "partySize"?: SchemaValue<Integer | QuantitativeValue | IdReference, "partySize">;
    /**
     * The startTime of something. For a reserved event or service (e.g. FoodEstablishmentReservation), the time that it is expected to start. For actions that span a period of time, when the action was performed. E.g. John wrote a book from _January_ to December. For media, including audio and video, it's the time offset of the start of a clip within a larger file.
     *
     * Note that Event uses startDate/endDate instead of startTime/endTime, even when describing dates with times. This situation may be clarified in future revisions.
     */
    "startTime"?: SchemaValue<DateTime | Time, "startTime">;
}
interface FoodEstablishmentReservationLeaf extends FoodEstablishmentReservationBase {
    "@type": "FoodEstablishmentReservation";
}
/**
 * A reservation to dine at a food-related business.
 *
 * Note: This type is for information about actual reservations, e.g. in confirmation emails or HTML pages with individual confirmations of reservations.
 */
export type FoodEstablishmentReservation = FoodEstablishmentReservationLeaf;
interface FoodEventLeaf extends EventBase {
    "@type": "FoodEvent";
}
/** Event type: Food event. */
export type FoodEvent = FoodEventLeaf;
interface FoodServiceLeaf extends ServiceBase {
    "@type": "FoodService";
}
/** A food service, like breakfast, lunch, or dinner. */
export type FoodService = FoodServiceLeaf;
interface FundingAgencyLeaf extends OrganizationBase {
    "@type": "FundingAgency";
}
/**
 * A FundingAgency is an organization that implements one or more {@link https://schema.org/FundingScheme FundingScheme}s and manages the granting process (via {@link https://schema.org/Grant Grant}s, typically {@link https://schema.org/MonetaryGrant MonetaryGrant}s). A funding agency is not always required for grant funding, e.g. philanthropic giving, corporate sponsorship etc.
 *
 * Examples of funding agencies include ERC, REA, NIH, Bill and Melinda Gates Foundation, ...
 */
export type FundingAgency = FundingAgencyLeaf | string;
interface FundingSchemeLeaf extends OrganizationBase {
    "@type": "FundingScheme";
}
/** A FundingScheme combines organizational, project and policy aspects of grant-based funding that sets guidelines, principles and mechanisms to support other kinds of projects and activities. Funding is typically organized via {@link https://schema.org/Grant Grant} funding. Examples of funding schemes: Swiss Priority Programmes (SPPs); EU Framework 7 (FP7); Horizon 2020; the NIH-R01 Grant Program; Wellcome institutional strategic support fund. For large scale public sector funding, the management and administration of grant awards is often handled by other, dedicated, organizations - {@link https://schema.org/FundingAgency FundingAgency}s such as ERC, REA, ... */
export type FundingScheme = FundingSchemeLeaf | string;
interface FurnitureStoreLeaf extends LocalBusinessBase {
    "@type": "FurnitureStore";
}
/** A furniture store. */
export type FurnitureStore = FurnitureStoreLeaf | string;
interface GameBase extends CreativeWorkBase {
    /** A piece of data that represents a particular aspect of a fictional character (skill, power, character points, advantage, disadvantage). */
    "characterAttribute"?: SchemaValue<Thing | IdReference, "characterAttribute">;
    /** An item is an object within the game world that can be collected by a player or, occasionally, a non-player character. */
    "gameItem"?: SchemaValue<Thing | IdReference, "gameItem">;
    /** Real or fictional location of the game (or part of game). */
    "gameLocation"?: SchemaValue<Place | PostalAddress | URL | IdReference, "gameLocation">;
    /** Indicate how many people can play this game (minimum, maximum, or range). */
    "numberOfPlayers"?: SchemaValue<QuantitativeValue | IdReference, "numberOfPlayers">;
    /** The task that a player-controlled character, or group of characters may complete in order to gain a reward. */
    "quest"?: SchemaValue<Thing | IdReference, "quest">;
}
interface GameLeaf extends GameBase {
    "@type": "Game";
}
/** The Game type represents things which are games. These are typically rule-governed recreational activities, e.g. role-playing games in which players assume the role of characters in a fictional setting. */
export type Game = GameLeaf | VideoGame;
interface GameAvailabilityEnumerationLeaf extends EnumerationBase {
    "@type": "GameAvailabilityEnumeration";
}
/** For a {@link https://schema.org/VideoGame VideoGame}, such as used with a {@link https://schema.org/PlayGameAction PlayGameAction}, an enumeration of the kind of game availability offered. */
export type GameAvailabilityEnumeration = "https://schema.org/DemoGameAvailability" | "DemoGameAvailability" | "https://schema.org/FullGameAvailability" | "FullGameAvailability" | GameAvailabilityEnumerationLeaf;
interface GamePlayModeLeaf extends EnumerationBase {
    "@type": "GamePlayMode";
}
/** Indicates whether this game is multi-player, co-op or single-player. */
export type GamePlayMode = "https://schema.org/CoOp" | "CoOp" | "https://schema.org/MultiPlayer" | "MultiPlayer" | "https://schema.org/SinglePlayer" | "SinglePlayer" | GamePlayModeLeaf;
interface GameServerBase extends ThingBase {
    /** Video game which is played on this server. */
    "game"?: SchemaValue<VideoGame | IdReference, "game">;
    /** Number of players on the server. */
    "playersOnline"?: SchemaValue<Integer, "playersOnline">;
    /** Status of a game server. */
    "serverStatus"?: SchemaValue<GameServerStatus | IdReference, "serverStatus">;
}
interface GameServerLeaf extends GameServerBase {
    "@type": "GameServer";
}
/** Server that provides game interaction in a multiplayer game. */
export type GameServer = GameServerLeaf;
interface GameServerStatusLeaf extends EnumerationBase {
    "@type": "GameServerStatus";
}
/** Status of a game server. */
export type GameServerStatus = "https://schema.org/OfflinePermanently" | "OfflinePermanently" | "https://schema.org/OfflineTemporarily" | "OfflineTemporarily" | "https://schema.org/Online" | "Online" | "https://schema.org/OnlineFull" | "OnlineFull" | GameServerStatusLeaf;
interface GardenStoreLeaf extends LocalBusinessBase {
    "@type": "GardenStore";
}
/** A garden store. */
export type GardenStore = GardenStoreLeaf | string;
interface GasStationLeaf extends LocalBusinessBase {
    "@type": "GasStation";
}
/** A gas station. */
export type GasStation = GasStationLeaf | string;
interface GatedResidenceCommunityLeaf extends ResidenceBase {
    "@type": "GatedResidenceCommunity";
}
/** Residence type: Gated community. */
export type GatedResidenceCommunity = GatedResidenceCommunityLeaf | string;
interface GenderTypeLeaf extends EnumerationBase {
    "@type": "GenderType";
}
/** An enumeration of genders. */
export type GenderType = "https://schema.org/Female" | "Female" | "https://schema.org/Male" | "Male" | GenderTypeLeaf;
interface GeneBase extends BioChemEntityBase {
    /** Another gene which is a variation of this one. */
    "alternativeOf"?: SchemaValue<Gene | IdReference, "alternativeOf">;
    /** Another BioChemEntity encoded by this one. */
    "encodesBioChemEntity"?: SchemaValue<BioChemEntity | IdReference, "encodesBioChemEntity">;
    /** Tissue, organ, biological sample, etc in which activity of this gene has been observed experimentally. For example brain, digestive system. */
    "expressedIn"?: SchemaValue<AnatomicalStructure | AnatomicalSystem | BioChemEntity | DefinedTerm | IdReference, "expressedIn">;
    /** A symbolic representation of a BioChemEntity. For example, a nucleotide sequence of a Gene or an amino acid sequence of a Protein. */
    "hasBioPolymerSequence"?: SchemaValue<Text, "hasBioPolymerSequence">;
}
interface GeneLeaf extends GeneBase {
    "@type": "Gene";
}
/** A discrete unit of inheritance which affects one or more biological traits (Source: {@link https://en.wikipedia.org/wiki/Gene https://en.wikipedia.org/wiki/Gene}). Examples include FOXP2 (Forkhead box protein P2), SCARNA21 (small Cajal body-specific RNA 21), A- (agouti genotype). */
export type Gene = GeneLeaf;
interface GeneralContractorLeaf extends LocalBusinessBase {
    "@type": "GeneralContractor";
}
/** A general contractor. */
export type GeneralContractor = GeneralContractorLeaf | string;
interface GeoCircleBase extends GeoShapeBase {
    /** Indicates the GeoCoordinates at the centre of a GeoShape, e.g. GeoCircle. */
    "geoMidpoint"?: SchemaValue<GeoCoordinates | IdReference, "geoMidpoint">;
    /** Indicates the approximate radius of a GeoCircle (metres unless indicated otherwise via Distance notation). */
    "geoRadius"?: SchemaValue<Distance | Number | Text | IdReference, "geoRadius">;
}
interface GeoCircleLeaf extends GeoCircleBase {
    "@type": "GeoCircle";
}
/** A GeoCircle is a GeoShape representing a circular geographic area. As it is a GeoShape it provides the simple textual property 'circle', but also allows the combination of postalCode alongside geoRadius. The center of the circle can be indicated via the 'geoMidpoint' property, or more approximately using 'address', 'postalCode'. */
export type GeoCircle = GeoCircleLeaf;
interface GeoCoordinatesBase extends ThingBase {
    /** Physical address of the item. */
    "address"?: SchemaValue<PostalAddress | Text | IdReference, "address">;
    /** The country. Recommended to be in 2-letter {@link http://en.wikipedia.org/wiki/ISO_3166-1 ISO 3166-1 alpha-2} format, for example "US". For backward compatibility, a 3-letter {@link https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3 ISO 3166-1 alpha-3} country code such as "SGP" or a full country name such as "Singapore" can also be used. */
    "addressCountry"?: SchemaValue<Country | Text | IdReference, "addressCountry">;
    /** The elevation of a location ({@link https://en.wikipedia.org/wiki/World_Geodetic_System WGS 84}). Values may be of the form 'NUMBER UNIT_OF_MEASUREMENT' (e.g., '1,000 m', '3,200 ft') while numbers alone should be assumed to be a value in meters. */
    "elevation"?: SchemaValue<Number | Text, "elevation">;
    /** The latitude of a location. For example `37.42242` ({@link https://en.wikipedia.org/wiki/World_Geodetic_System WGS 84}). */
    "latitude"?: SchemaValue<Number | Text, "latitude">;
    /** The longitude of a location. For example `-122.08585` ({@link https://en.wikipedia.org/wiki/World_Geodetic_System WGS 84}). */
    "longitude"?: SchemaValue<Number | Text, "longitude">;
    /** The postal code. For example, 94043. */
    "postalCode"?: SchemaValue<Text, "postalCode">;
}
interface GeoCoordinatesLeaf extends GeoCoordinatesBase {
    "@type": "GeoCoordinates";
}
/** The geographic coordinates of a place or event. */
export type GeoCoordinates = GeoCoordinatesLeaf;
interface GeoShapeBase extends ThingBase {
    /** Physical address of the item. */
    "address"?: SchemaValue<PostalAddress | Text | IdReference, "address">;
    /** The country. Recommended to be in 2-letter {@link http://en.wikipedia.org/wiki/ISO_3166-1 ISO 3166-1 alpha-2} format, for example "US". For backward compatibility, a 3-letter {@link https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3 ISO 3166-1 alpha-3} country code such as "SGP" or a full country name such as "Singapore" can also be used. */
    "addressCountry"?: SchemaValue<Country | Text | IdReference, "addressCountry">;
    /** A box is the area enclosed by the rectangle formed by two points. The first point is the lower corner, the second point is the upper corner. A box is expressed as two points separated by a space character. */
    "box"?: SchemaValue<Text, "box">;
    /** A circle is the circular region of a specified radius centered at a specified latitude and longitude. A circle is expressed as a pair followed by a radius in meters. */
    "circle"?: SchemaValue<Text, "circle">;
    /** The elevation of a location ({@link https://en.wikipedia.org/wiki/World_Geodetic_System WGS 84}). Values may be of the form 'NUMBER UNIT_OF_MEASUREMENT' (e.g., '1,000 m', '3,200 ft') while numbers alone should be assumed to be a value in meters. */
    "elevation"?: SchemaValue<Number | Text, "elevation">;
    /** A line is a point-to-point path consisting of two or more points. A line is expressed as a series of two or more point objects separated by space. */
    "line"?: SchemaValue<Text, "line">;
    /** A polygon is the area enclosed by a point-to-point path for which the starting and ending points are the same. A polygon is expressed as a series of four or more space delimited points where the first and final points are identical. */
    "polygon"?: SchemaValue<Text, "polygon">;
    /** The postal code. For example, 94043. */
    "postalCode"?: SchemaValue<Text, "postalCode">;
}
interface GeoShapeLeaf extends GeoShapeBase {
    "@type": "GeoShape";
}
/** The geographic shape of a place. A GeoShape can be described using several properties whose values are based on latitude/longitude pairs. Either whitespace or commas can be used to separate latitude and longitude; whitespace should be used when writing a list of several such points. */
export type GeoShape = GeoShapeLeaf | GeoCircle;
interface GeospatialGeometryBase extends ThingBase {
    /** Represents a relationship between two geometries (or the places they represent), relating a containing geometry to a contained geometry. "a contains b iff no points of b lie in the exterior of a, and at least one point of the interior of b lies in the interior of a". As defined in {@link https://en.wikipedia.org/wiki/DE-9IM DE-9IM}. */
    "geoContains"?: SchemaValue<GeospatialGeometry | Place | IdReference, "geoContains">;
    /** Represents a relationship between two geometries (or the places they represent), relating a geometry to another that covers it. As defined in {@link https://en.wikipedia.org/wiki/DE-9IM DE-9IM}. */
    "geoCoveredBy"?: SchemaValue<GeospatialGeometry | Place | IdReference, "geoCoveredBy">;
    /** Represents a relationship between two geometries (or the places they represent), relating a covering geometry to a covered geometry. "Every point of b is a point of (the interior or boundary of) a". As defined in {@link https://en.wikipedia.org/wiki/DE-9IM DE-9IM}. */
    "geoCovers"?: SchemaValue<GeospatialGeometry | Place | IdReference, "geoCovers">;
    /** Represents a relationship between two geometries (or the places they represent), relating a geometry to another that crosses it: "a crosses b: they have some but not all interior points in common, and the dimension of the intersection is less than that of at least one of them". As defined in {@link https://en.wikipedia.org/wiki/DE-9IM DE-9IM}. */
    "geoCrosses"?: SchemaValue<GeospatialGeometry | Place | IdReference, "geoCrosses">;
    /** Represents spatial relations in which two geometries (or the places they represent) are topologically disjoint: "they have no point in common. They form a set of disconnected geometries." (A symmetric relationship, as defined in {@link https://en.wikipedia.org/wiki/DE-9IM DE-9IM}.) */
    "geoDisjoint"?: SchemaValue<GeospatialGeometry | Place | IdReference, "geoDisjoint">;
    /** Represents spatial relations in which two geometries (or the places they represent) are topologically equal, as defined in {@link https://en.wikipedia.org/wiki/DE-9IM DE-9IM}. "Two geometries are topologically equal if their interiors intersect and no part of the interior or boundary of one geometry intersects the exterior of the other" (a symmetric relationship). */
    "geoEquals"?: SchemaValue<GeospatialGeometry | Place | IdReference, "geoEquals">;
    /** Represents spatial relations in which two geometries (or the places they represent) have at least one point in common. As defined in {@link https://en.wikipedia.org/wiki/DE-9IM DE-9IM}. */
    "geoIntersects"?: SchemaValue<GeospatialGeometry | Place | IdReference, "geoIntersects">;
    /** Represents a relationship between two geometries (or the places they represent), relating a geometry to another that geospatially overlaps it, i.e. they have some but not all points in common. As defined in {@link https://en.wikipedia.org/wiki/DE-9IM DE-9IM}. */
    "geoOverlaps"?: SchemaValue<GeospatialGeometry | Place | IdReference, "geoOverlaps">;
    /** Represents spatial relations in which two geometries (or the places they represent) touch: "they have at least one boundary point in common, but no interior points." (A symmetric relationship, as defined in {@link https://en.wikipedia.org/wiki/DE-9IM DE-9IM}.) */
    "geoTouches"?: SchemaValue<GeospatialGeometry | Place | IdReference, "geoTouches">;
    /** Represents a relationship between two geometries (or the places they represent), relating a geometry to one that contains it, i.e. it is inside (i.e. within) its interior. As defined in {@link https://en.wikipedia.org/wiki/DE-9IM DE-9IM}. */
    "geoWithin"?: SchemaValue<GeospatialGeometry | Place | IdReference, "geoWithin">;
}
interface GeospatialGeometryLeaf extends GeospatialGeometryBase {
    "@type": "GeospatialGeometry";
}
/** (Eventually to be defined as) a supertype of GeoShape designed to accommodate definitions from Geo-Spatial best practices. */
export type GeospatialGeometry = GeospatialGeometryLeaf;
interface GeriatricLeaf extends LocalBusinessBase {
    "@type": "Geriatric";
}
/** A specific branch of medical science that is concerned with the diagnosis and treatment of diseases, debilities and provision of care to the aged. */
export type Geriatric = GeriatricLeaf | string;
interface GiveActionBase extends TransferActionBase {
    /** A sub property of participant. The participant who is at the receiving end of the action. */
    "recipient"?: SchemaValue<Audience | ContactPoint | Organization | Person | IdReference, "recipient">;
}
interface GiveActionLeaf extends GiveActionBase {
    "@type": "GiveAction";
}
/**
 * The act of transferring ownership of an object to a destination. Reciprocal of TakeAction.
 *
 * Related actions:
 * - {@link https://schema.org/TakeAction TakeAction}: Reciprocal of GiveAction.
 * - {@link https://schema.org/SendAction SendAction}: Unlike SendAction, GiveAction implies that ownership is being transferred (e.g. I may send my laptop to you, but that doesn't mean I'm giving it to you).
 */
export type GiveAction = GiveActionLeaf;
interface GolfCourseLeaf extends LocalBusinessBase {
    "@type": "GolfCourse";
}
/** A golf course. */
export type GolfCourse = GolfCourseLeaf | string;
interface GovernmentBenefitsTypeLeaf extends EnumerationBase {
    "@type": "GovernmentBenefitsType";
}
/** GovernmentBenefitsType enumerates several kinds of government benefits to support the COVID-19 situation. Note that this structure may not capture all benefits offered. */
export type GovernmentBenefitsType = "https://schema.org/BasicIncome" | "BasicIncome" | "https://schema.org/BusinessSupport" | "BusinessSupport" | "https://schema.org/DisabilitySupport" | "DisabilitySupport" | "https://schema.org/HealthCare" | "HealthCare" | "https://schema.org/OneTimePayments" | "OneTimePayments" | "https://schema.org/PaidLeave" | "PaidLeave" | "https://schema.org/ParentalSupport" | "ParentalSupport" | "https://schema.org/UnemploymentSupport" | "UnemploymentSupport" | GovernmentBenefitsTypeLeaf;
interface GovernmentBuildingLeaf extends CivicStructureBase {
    "@type": "GovernmentBuilding";
}
/** A government building. */
export type GovernmentBuilding = GovernmentBuildingLeaf | CityHall | Courthouse | DefenceEstablishment | Embassy | LegislativeBuilding | string;
interface GovernmentOfficeLeaf extends LocalBusinessBase {
    "@type": "GovernmentOffice";
}
/** A government office—for example, an IRS or DMV office. */
export type GovernmentOffice = GovernmentOfficeLeaf | PostOffice | string;
interface GovernmentOrganizationLeaf extends OrganizationBase {
    "@type": "GovernmentOrganization";
}
/** A governmental organization or agency. */
export type GovernmentOrganization = GovernmentOrganizationLeaf | string;
interface GovernmentPermitLeaf extends PermitBase {
    "@type": "GovernmentPermit";
}
/** A permit issued by a government agency. */
export type GovernmentPermit = GovernmentPermitLeaf;
interface GovernmentServiceBase extends ServiceBase {
    /** Indicates a legal jurisdiction, e.g. of some legislation, or where some government service is based. */
    "jurisdiction"?: SchemaValue<AdministrativeArea | Text | IdReference, "jurisdiction">;
    /** The operating organization, if different from the provider. This enables the representation of services that are provided by an organization, but operated by another organization like a subcontractor. */
    "serviceOperator"?: SchemaValue<Organization | IdReference, "serviceOperator">;
}
interface GovernmentServiceLeaf extends GovernmentServiceBase {
    "@type": "GovernmentService";
}
/** A service provided by a government organization, e.g. food stamps, veterans benefits, etc. */
export type GovernmentService = GovernmentServiceLeaf;
interface GrantBase extends ThingBase {
    /** Indicates something directly or indirectly funded or sponsored through a {@link https://schema.org/Grant Grant}. See also {@link https://schema.org/ownershipFundingInfo ownershipFundingInfo}. */
    "fundedItem"?: SchemaValue<BioChemEntity | CreativeWork | Event | MedicalEntity | Organization | Person | Product | IdReference, "fundedItem">;
    /** A person or organization that supports (sponsors) something through some kind of financial contribution. */
    "funder"?: SchemaValue<Organization | Person | IdReference, "funder">;
    /** A person or organization that supports a thing through a pledge, promise, or financial contribution. E.g. a sponsor of a Medical Study or a corporate sponsor of an event. */
    "sponsor"?: SchemaValue<Organization | Person | IdReference, "sponsor">;
}
interface GrantLeaf extends GrantBase {
    "@type": "Grant";
}
/**
 * A grant, typically financial or otherwise quantifiable, of resources. Typically a {@link https://schema.org/funder funder} sponsors some {@link https://schema.org/MonetaryAmount MonetaryAmount} to an {@link https://schema.org/Organization Organization} or {@link https://schema.org/Person Person}, sometimes not necessarily via a dedicated or long-lived {@link https://schema.org/Project Project}, resulting in one or more outputs, or {@link https://schema.org/fundedItem fundedItem}s. For financial sponsorship, indicate the {@link https://schema.org/funder funder} of a {@link https://schema.org/MonetaryGrant MonetaryGrant}. For non-financial support, indicate {@link https://schema.org/sponsor sponsor} of {@link https://schema.org/Grant Grant}s of resources (e.g. office space).
 *
 * Grants support activities directed towards some agreed collective goals, often but not always organized as {@link https://schema.org/Project Project}s. Long-lived projects are sometimes sponsored by a variety of grants over time, but it is also common for a project to be associated with a single grant.
 *
 * The amount of a {@link https://schema.org/Grant Grant} is represented using {@link https://schema.org/amount amount} as a {@link https://schema.org/MonetaryAmount MonetaryAmount}.
 */
export type Grant = GrantLeaf | MonetaryGrant;
interface GroceryStoreLeaf extends LocalBusinessBase {
    "@type": "GroceryStore";
}
/** A grocery store. */
export type GroceryStore = GroceryStoreLeaf | string;
interface GuideBase extends CreativeWorkBase {
    /** This Review or Rating is relevant to this part or facet of the itemReviewed. */
    "reviewAspect"?: SchemaValue<Text, "reviewAspect">;
}
interface GuideLeaf extends GuideBase {
    "@type": "Guide";
}
/** {@link https://schema.org/Guide Guide} is a page or article that recommends specific products or services, or aspects of a thing for a user to consider. A {@link https://schema.org/Guide Guide} may represent a Buying Guide and detail aspects of products or services for a user to consider. A {@link https://schema.org/Guide Guide} may represent a Product Guide and recommend specific products or services. A {@link https://schema.org/Guide Guide} may represent a Ranked List and recommend specific products or services with ranking. */
export type Guide = GuideLeaf;
interface GynecologicLeaf extends LocalBusinessBase {
    "@type": "Gynecologic";
}
/** A specific branch of medical science that pertains to the health care of women, particularly in the diagnosis and treatment of disorders affecting the female reproductive system. */
export type Gynecologic = GynecologicLeaf | string;
interface HackathonLeaf extends EventBase {
    "@type": "Hackathon";
}
/** A {@link https://en.wikipedia.org/wiki/Hackathon hackathon} event. */
export type Hackathon = HackathonLeaf;
interface HairSalonLeaf extends LocalBusinessBase {
    "@type": "HairSalon";
}
/** A hair salon. */
export type HairSalon = HairSalonLeaf | string;
interface HardwareStoreLeaf extends LocalBusinessBase {
    "@type": "HardwareStore";
}
/** A hardware store. */
export type HardwareStore = HardwareStoreLeaf | string;
interface HealthAndBeautyBusinessLeaf extends LocalBusinessBase {
    "@type": "HealthAndBeautyBusiness";
}
/** Health and beauty. */
export type HealthAndBeautyBusiness = HealthAndBeautyBusinessLeaf | BeautySalon | DaySpa | HairSalon | HealthClub | NailSalon | TattooParlor | string;
interface HealthAspectEnumerationLeaf extends EnumerationBase {
    "@type": "HealthAspectEnumeration";
}
/** HealthAspectEnumeration enumerates several aspects of health content online, each of which might be described using {@link https://schema.org/hasHealthAspect hasHealthAspect} and {@link https://schema.org/HealthTopicContent HealthTopicContent}. */
export type HealthAspectEnumeration = "https://schema.org/AllergiesHealthAspect" | "AllergiesHealthAspect" | "https://schema.org/BenefitsHealthAspect" | "BenefitsHealthAspect" | "https://schema.org/CausesHealthAspect" | "CausesHealthAspect" | "https://schema.org/ContagiousnessHealthAspect" | "ContagiousnessHealthAspect" | "https://schema.org/EffectivenessHealthAspect" | "EffectivenessHealthAspect" | "https://schema.org/GettingAccessHealthAspect" | "GettingAccessHealthAspect" | "https://schema.org/HowItWorksHealthAspect" | "HowItWorksHealthAspect" | "https://schema.org/HowOrWhereHealthAspect" | "HowOrWhereHealthAspect" | "https://schema.org/IngredientsHealthAspect" | "IngredientsHealthAspect" | "https://schema.org/LivingWithHealthAspect" | "LivingWithHealthAspect" | "https://schema.org/MayTreatHealthAspect" | "MayTreatHealthAspect" | "https://schema.org/MisconceptionsHealthAspect" | "MisconceptionsHealthAspect" | "https://schema.org/OverviewHealthAspect" | "OverviewHealthAspect" | "https://schema.org/PatientExperienceHealthAspect" | "PatientExperienceHealthAspect" | "https://schema.org/PregnancyHealthAspect" | "PregnancyHealthAspect" | "https://schema.org/PreventionHealthAspect" | "PreventionHealthAspect" | "https://schema.org/PrognosisHealthAspect" | "PrognosisHealthAspect" | "https://schema.org/RelatedTopicsHealthAspect" | "RelatedTopicsHealthAspect" | "https://schema.org/RisksOrComplicationsHealthAspect" | "RisksOrComplicationsHealthAspect" | "https://schema.org/SafetyHealthAspect" | "SafetyHealthAspect" | "https://schema.org/ScreeningHealthAspect" | "ScreeningHealthAspect" | "https://schema.org/SeeDoctorHealthAspect" | "SeeDoctorHealthAspect" | "https://schema.org/SelfCareHealthAspect" | "SelfCareHealthAspect" | "https://schema.org/SideEffectsHealthAspect" | "SideEffectsHealthAspect" | "https://schema.org/StagesHealthAspect" | "StagesHealthAspect" | "https://schema.org/SymptomsHealthAspect" | "SymptomsHealthAspect" | "https://schema.org/TreatmentsHealthAspect" | "TreatmentsHealthAspect" | "https://schema.org/TypesHealthAspect" | "TypesHealthAspect" | "https://schema.org/UsageOrScheduleHealthAspect" | "UsageOrScheduleHealthAspect" | HealthAspectEnumerationLeaf;
interface HealthClubBase extends LocalBusinessBase, LocalBusinessBase {
}
interface HealthClubLeaf extends HealthClubBase {
    "@type": "HealthClub";
}
/** A health club. */
export type HealthClub = HealthClubLeaf | string;
interface HealthInsurancePlanBase extends ThingBase {
    /** The URL that goes directly to the summary of benefits and coverage for the specific standard plan or plan variation. */
    "benefitsSummaryUrl"?: SchemaValue<URL, "benefitsSummaryUrl">;
    /** A contact point for a person or organization. */
    "contactPoint"?: SchemaValue<ContactPoint | IdReference, "contactPoint">;
    /** TODO. */
    "healthPlanDrugOption"?: SchemaValue<Text, "healthPlanDrugOption">;
    /** The tier(s) of drugs offered by this formulary or insurance plan. */
    "healthPlanDrugTier"?: SchemaValue<Text, "healthPlanDrugTier">;
    /** The 14-character, HIOS-generated Plan ID number. (Plan IDs must be unique, even across different markets.) */
    "healthPlanId"?: SchemaValue<Text, "healthPlanId">;
    /** The URL that goes directly to the plan brochure for the specific standard plan or plan variation. */
    "healthPlanMarketingUrl"?: SchemaValue<URL, "healthPlanMarketingUrl">;
    /** Formularies covered by this plan. */
    "includesHealthPlanFormulary"?: SchemaValue<HealthPlanFormulary | IdReference, "includesHealthPlanFormulary">;
    /** Networks covered by this plan. */
    "includesHealthPlanNetwork"?: SchemaValue<HealthPlanNetwork | IdReference, "includesHealthPlanNetwork">;
    /** The standard for interpreting the Plan ID. The preferred is "HIOS". See the Centers for Medicare & Medicaid Services for more details. */
    "usesHealthPlanIdStandard"?: SchemaValue<Text | URL, "usesHealthPlanIdStandard">;
}
interface HealthInsurancePlanLeaf extends HealthInsurancePlanBase {
    "@type": "HealthInsurancePlan";
}
/** A US-style health insurance plan, including PPOs, EPOs, and HMOs. */
export type HealthInsurancePlan = HealthInsurancePlanLeaf;
interface HealthPlanCostSharingSpecificationBase extends ThingBase {
    /** Whether the coinsurance applies before or after deductible, etc. TODO: Is this a closed set? */
    "healthPlanCoinsuranceOption"?: SchemaValue<Text, "healthPlanCoinsuranceOption">;
    /** The rate of coinsurance expressed as a number between 0.0 and 1.0. */
    "healthPlanCoinsuranceRate"?: SchemaValue<Number, "healthPlanCoinsuranceRate">;
    /** The copay amount. */
    "healthPlanCopay"?: SchemaValue<PriceSpecification | IdReference, "healthPlanCopay">;
    /** Whether the copay is before or after deductible, etc. TODO: Is this a closed set? */
    "healthPlanCopayOption"?: SchemaValue<Text, "healthPlanCopayOption">;
    /** The category or type of pharmacy associated with this cost sharing. */
    "healthPlanPharmacyCategory"?: SchemaValue<Text, "healthPlanPharmacyCategory">;
}
interface HealthPlanCostSharingSpecificationLeaf extends HealthPlanCostSharingSpecificationBase {
    "@type": "HealthPlanCostSharingSpecification";
}
/** A description of costs to the patient under a given network or formulary. */
export type HealthPlanCostSharingSpecification = HealthPlanCostSharingSpecificationLeaf;
interface HealthPlanFormularyBase extends ThingBase {
    /** The costs to the patient for services under this network or formulary. */
    "healthPlanCostSharing"?: SchemaValue<Boolean, "healthPlanCostSharing">;
    /** The tier(s) of drugs offered by this formulary or insurance plan. */
    "healthPlanDrugTier"?: SchemaValue<Text, "healthPlanDrugTier">;
    /** Whether prescriptions can be delivered by mail. */
    "offersPrescriptionByMail"?: SchemaValue<Boolean, "offersPrescriptionByMail">;
}
interface HealthPlanFormularyLeaf extends HealthPlanFormularyBase {
    "@type": "HealthPlanFormulary";
}
/** For a given health insurance plan, the specification for costs and coverage of prescription drugs. */
export type HealthPlanFormulary = HealthPlanFormularyLeaf;
interface HealthPlanNetworkBase extends ThingBase {
    /** The costs to the patient for services under this network or formulary. */
    "healthPlanCostSharing"?: SchemaValue<Boolean, "healthPlanCostSharing">;
    /** Name or unique ID of network. (Networks are often reused across different insurance plans.) */
    "healthPlanNetworkId"?: SchemaValue<Text, "healthPlanNetworkId">;
    /** The tier(s) for this network. */
    "healthPlanNetworkTier"?: SchemaValue<Text, "healthPlanNetworkTier">;
}
interface HealthPlanNetworkLeaf extends HealthPlanNetworkBase {
    "@type": "HealthPlanNetwork";
}
/** A US-style health insurance plan network. */
export type HealthPlanNetwork = HealthPlanNetworkLeaf;
interface HealthTopicContentBase extends CreativeWorkBase {
    /** Indicates the aspect or aspects specifically addressed in some {@link https://schema.org/HealthTopicContent HealthTopicContent}. For example, that the content is an overview, or that it talks about treatment, self-care, treatments or their side-effects. */
    "hasHealthAspect"?: SchemaValue<HealthAspectEnumeration | IdReference, "hasHealthAspect">;
}
interface HealthTopicContentLeaf extends HealthTopicContentBase {
    "@type": "HealthTopicContent";
}
/** {@link https://schema.org/HealthTopicContent HealthTopicContent} is {@link https://schema.org/WebContent WebContent} that is about some aspect of a health topic, e.g. a condition, its symptoms or treatments. Such content may be comprised of several parts or sections and use different types of media. Multiple instances of {@link https://schema.org/WebContent WebContent} (and hence {@link https://schema.org/HealthTopicContent HealthTopicContent}) can be related using {@link https://schema.org/hasPart hasPart} / {@link https://schema.org/isPartOf isPartOf} where there is some kind of content hierarchy, and their content described with {@link https://schema.org/about about} and {@link https://schema.org/mentions mentions} e.g. building upon the existing {@link https://schema.org/MedicalCondition MedicalCondition} vocabulary. */
export type HealthTopicContent = HealthTopicContentLeaf;
interface HighSchoolLeaf extends EducationalOrganizationBase {
    "@type": "HighSchool";
}
/** A high school. */
export type HighSchool = HighSchoolLeaf | string;
interface HinduTempleLeaf extends CivicStructureBase {
    "@type": "HinduTemple";
}
/** A Hindu temple. */
export type HinduTemple = HinduTempleLeaf | string;
interface HobbyShopLeaf extends LocalBusinessBase {
    "@type": "HobbyShop";
}
/** A store that sells materials useful or necessary for various hobbies. */
export type HobbyShop = HobbyShopLeaf | string;
interface HomeAndConstructionBusinessLeaf extends LocalBusinessBase {
    "@type": "HomeAndConstructionBusiness";
}
/**
 * A construction business.
 *
 * A HomeAndConstructionBusiness is a {@link https://schema.org/LocalBusiness LocalBusiness} that provides services around homes and buildings.
 *
 * As a {@link https://schema.org/LocalBusiness LocalBusiness} it can be described as a {@link https://schema.org/provider provider} of one or more {@link https://schema.org/Service Service}(s).
 */
export type HomeAndConstructionBusiness = HomeAndConstructionBusinessLeaf | Electrician | GeneralContractor | HousePainter | HVACBusiness | Locksmith | MovingCompany | Plumber | RoofingContractor | string;
interface HomeGoodsStoreLeaf extends LocalBusinessBase {
    "@type": "HomeGoodsStore";
}
/** A home goods store. */
export type HomeGoodsStore = HomeGoodsStoreLeaf | string;
interface HospitalBase extends CivicStructureBase, MedicalOrganizationBase, LocalBusinessBase {
    /** A medical service available from this provider. */
    "availableService"?: SchemaValue<MedicalProcedure | MedicalTest | MedicalTherapy | IdReference, "availableService">;
    /** Indicates data describing a hospital, e.g. a CDC {@link https://schema.org/CDCPMDRecord CDCPMDRecord} or as some kind of {@link https://schema.org/Dataset Dataset}. */
    "healthcareReportingData"?: SchemaValue<CDCPMDRecord | Dataset | IdReference, "healthcareReportingData">;
    /** A medical specialty of the provider. */
    "medicalSpecialty"?: SchemaValue<MedicalSpecialty | IdReference, "medicalSpecialty">;
}
interface HospitalLeaf extends HospitalBase {
    "@type": "Hospital";
}
/** A hospital. */
export type Hospital = HospitalLeaf | string;
interface HostelLeaf extends LodgingBusinessBase {
    "@type": "Hostel";
}
/**
 * A hostel - cheap accommodation, often in shared dormitories.
 *
 * See also the {@link /docs/hotels.html dedicated document on the use of schema.org for marking up hotels and other forms of accommodations}.
 */
export type Hostel = HostelLeaf | string;
interface HotelLeaf extends LodgingBusinessBase {
    "@type": "Hotel";
}
/**
 * A hotel is an establishment that provides lodging paid on a short-term basis (source: Wikipedia, the free encyclopedia, see http://en.wikipedia.org/wiki/Hotel).
 *
 * See also the {@link /docs/hotels.html dedicated document on the use of schema.org for marking up hotels and other forms of accommodations}.
 */
export type Hotel = HotelLeaf | string;
interface HotelRoomBase extends AccommodationBase {
    /** The type of bed or beds included in the accommodation. For the single case of just one bed of a certain type, you use bed directly with a text. If you want to indicate the quantity of a certain kind of bed, use an instance of BedDetails. For more detailed information, use the amenityFeature property. */
    "bed"?: SchemaValue<BedDetails | BedType | Text | IdReference, "bed">;
    /** The allowed total occupancy for the accommodation in persons (including infants etc). For individual accommodations, this is not necessarily the legal maximum but defines the permitted usage as per the contractual agreement (e.g. a double room used by a single person). Typical unit code(s): C62 for person. */
    "occupancy"?: SchemaValue<QuantitativeValue | IdReference, "occupancy">;
}
interface HotelRoomLeaf extends HotelRoomBase {
    "@type": "HotelRoom";
}
/**
 * A hotel room is a single room in a hotel.
 *
 * See also the {@link /docs/hotels.html dedicated document on the use of schema.org for marking up hotels and other forms of accommodations}.
 */
export type HotelRoom = HotelRoomLeaf | string;
interface HouseBase extends AccommodationBase {
    /** The number of rooms (excluding bathrooms and closets) of the accommodation or lodging business. Typical unit code(s): ROM for room or C62 for no unit. The type of room can be put in the unitText property of the QuantitativeValue. */
    "numberOfRooms"?: SchemaValue<Number | QuantitativeValue | IdReference, "numberOfRooms">;
}
interface HouseLeaf extends HouseBase {
    "@type": "House";
}
/** A house is a building or structure that has the ability to be occupied for habitation by humans or other creatures (source: Wikipedia, the free encyclopedia, see {@link http://en.wikipedia.org/wiki/House http://en.wikipedia.org/wiki/House}). */
export type House = HouseLeaf | SingleFamilyResidence | string;
interface HousePainterLeaf extends LocalBusinessBase {
    "@type": "HousePainter";
}
/** A house painting service. */
export type HousePainter = HousePainterLeaf | string;
interface HowToBase extends CreativeWorkBase {
    /** The estimated cost of the supply or supplies consumed when performing instructions. */
    "estimatedCost"?: SchemaValue<MonetaryAmount | Text | IdReference, "estimatedCost">;
    /** The length of time it takes to perform instructions or a direction (not including time to prepare the supplies), in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 duration format}. */
    "performTime"?: SchemaValue<Duration | IdReference, "performTime">;
    /** The length of time it takes to prepare the items to be used in instructions or a direction, in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 duration format}. */
    "prepTime"?: SchemaValue<Duration | IdReference, "prepTime">;
    /** A single step item (as HowToStep, text, document, video, etc.) or a HowToSection. */
    "step"?: SchemaValue<CreativeWork | HowToSection | HowToStep | Text | IdReference, "step">;
    /**
     * A single step item (as HowToStep, text, document, video, etc.) or a HowToSection (originally misnamed 'steps'; 'step' is preferred).
     *
     * @deprecated Consider using https://schema.org/step instead.
     */
    "steps"?: SchemaValue<CreativeWork | ItemList | Text | IdReference, "steps">;
    /** A sub-property of instrument. A supply consumed when performing instructions or a direction. */
    "supply"?: SchemaValue<HowToSupply | Text | IdReference, "supply">;
    /** A sub property of instrument. An object used (but not consumed) when performing instructions or a direction. */
    "tool"?: SchemaValue<HowToTool | Text | IdReference, "tool">;
    /** The total time required to perform instructions or a direction (including time to prepare the supplies), in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 duration format}. */
    "totalTime"?: SchemaValue<Duration | IdReference, "totalTime">;
    /** The quantity that results by performing instructions. For example, a paper airplane, 10 personalized candles. */
    "yield"?: SchemaValue<QuantitativeValue | Text | IdReference, "yield">;
}
interface HowToLeaf extends HowToBase {
    "@type": "HowTo";
}
/** Instructions that explain how to achieve a result by performing a sequence of steps. */
export type HowTo = HowToLeaf | Recipe;
interface HowToDirectionBase extends CreativeWorkBase, ListItemBase {
    /** A media object representing the circumstances after performing this direction. */
    "afterMedia"?: SchemaValue<MediaObject | URL | IdReference, "afterMedia">;
    /** A media object representing the circumstances before performing this direction. */
    "beforeMedia"?: SchemaValue<MediaObject | URL | IdReference, "beforeMedia">;
    /** A media object representing the circumstances while performing this direction. */
    "duringMedia"?: SchemaValue<MediaObject | URL | IdReference, "duringMedia">;
    /** The length of time it takes to perform instructions or a direction (not including time to prepare the supplies), in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 duration format}. */
    "performTime"?: SchemaValue<Duration | IdReference, "performTime">;
    /** The length of time it takes to prepare the items to be used in instructions or a direction, in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 duration format}. */
    "prepTime"?: SchemaValue<Duration | IdReference, "prepTime">;
    /** A sub-property of instrument. A supply consumed when performing instructions or a direction. */
    "supply"?: SchemaValue<HowToSupply | Text | IdReference, "supply">;
    /** A sub property of instrument. An object used (but not consumed) when performing instructions or a direction. */
    "tool"?: SchemaValue<HowToTool | Text | IdReference, "tool">;
    /** The total time required to perform instructions or a direction (including time to prepare the supplies), in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 duration format}. */
    "totalTime"?: SchemaValue<Duration | IdReference, "totalTime">;
}
interface HowToDirectionLeaf extends HowToDirectionBase {
    "@type": "HowToDirection";
}
/** A direction indicating a single action to do in the instructions for how to achieve a result. */
export type HowToDirection = HowToDirectionLeaf;
interface HowToItemBase extends ListItemBase {
    /** The required quantity of the item(s). */
    "requiredQuantity"?: SchemaValue<Number | QuantitativeValue | Text | IdReference, "requiredQuantity">;
}
interface HowToItemLeaf extends HowToItemBase {
    "@type": "HowToItem";
}
/** An item used as either a tool or supply when performing the instructions for how to achieve a result. */
export type HowToItem = HowToItemLeaf | HowToSupply | HowToTool;
interface HowToSectionBase extends CreativeWorkBase, ListItemBase, ItemListBase {
    /**
     * A single step item (as HowToStep, text, document, video, etc.) or a HowToSection (originally misnamed 'steps'; 'step' is preferred).
     *
     * @deprecated Consider using https://schema.org/step instead.
     */
    "steps"?: SchemaValue<CreativeWork | ItemList | Text | IdReference, "steps">;
}
interface HowToSectionLeaf extends HowToSectionBase {
    "@type": "HowToSection";
}
/** A sub-grouping of steps in the instructions for how to achieve a result (e.g. steps for making a pie crust within a pie recipe). */
export type HowToSection = HowToSectionLeaf;
interface HowToStepBase extends CreativeWorkBase, ListItemBase, ItemListBase {
}
interface HowToStepLeaf extends HowToStepBase {
    "@type": "HowToStep";
}
/** A step in the instructions for how to achieve a result. It is an ordered list with HowToDirection and/or HowToTip items. */
export type HowToStep = HowToStepLeaf;
interface HowToSupplyBase extends HowToItemBase {
    /** The estimated cost of the supply or supplies consumed when performing instructions. */
    "estimatedCost"?: SchemaValue<MonetaryAmount | Text | IdReference, "estimatedCost">;
}
interface HowToSupplyLeaf extends HowToSupplyBase {
    "@type": "HowToSupply";
}
/** A supply consumed when performing the instructions for how to achieve a result. */
export type HowToSupply = HowToSupplyLeaf;
interface HowToTipBase extends CreativeWorkBase, ListItemBase {
}
interface HowToTipLeaf extends HowToTipBase {
    "@type": "HowToTip";
}
/** An explanation in the instructions for how to achieve a result. It provides supplementary information about a technique, supply, author's preference, etc. It can explain what could be done, or what should not be done, but doesn't specify what should be done (see HowToDirection). */
export type HowToTip = HowToTipLeaf;
interface HowToToolLeaf extends HowToItemBase {
    "@type": "HowToTool";
}
/** A tool used (but not consumed) when performing instructions for how to achieve a result. */
export type HowToTool = HowToToolLeaf;
interface HVACBusinessLeaf extends LocalBusinessBase {
    "@type": "HVACBusiness";
}
/** A business that provides Heating, Ventilation and Air Conditioning services. */
export type HVACBusiness = HVACBusinessLeaf | string;
interface HyperTocBase extends CreativeWorkBase {
    /** A media object that encodes this CreativeWork. This property is a synonym for encoding. */
    "associatedMedia"?: SchemaValue<MediaObject | IdReference, "associatedMedia">;
    /** Indicates a {@link https://schema.org/HyperTocEntry HyperTocEntry} in a {@link https://schema.org/HyperToc HyperToc}. */
    "tocEntry"?: SchemaValue<HyperTocEntry | IdReference, "tocEntry">;
}
interface HyperTocLeaf extends HyperTocBase {
    "@type": "HyperToc";
}
/** A HyperToc represents a hypertext table of contents for complex media objects, such as {@link https://schema.org/VideoObject VideoObject}, {@link https://schema.org/AudioObject AudioObject}. Items in the table of contents are indicated using the {@link https://schema.org/tocEntry tocEntry} property, and typed {@link https://schema.org/HyperTocEntry HyperTocEntry}. For cases where the same larger work is split into multiple files, {@link https://schema.org/associatedMedia associatedMedia} can be used on individual {@link https://schema.org/HyperTocEntry HyperTocEntry} items. */
export type HyperToc = HyperTocLeaf;
interface HyperTocEntryBase extends CreativeWorkBase {
    /** A media object that encodes this CreativeWork. This property is a synonym for encoding. */
    "associatedMedia"?: SchemaValue<MediaObject | IdReference, "associatedMedia">;
    /** A {@link https://schema.org/HyperTocEntry HyperTocEntry} can have a {@link https://schema.org/tocContinuation tocContinuation} indicated, which is another {@link https://schema.org/HyperTocEntry HyperTocEntry} that would be the default next item to play or render. */
    "tocContinuation"?: SchemaValue<HyperTocEntry | IdReference, "tocContinuation">;
    /** Text of an utterances (spoken words, lyrics etc.) that occurs at a certain section of a media object, represented as a {@link https://schema.org/HyperTocEntry HyperTocEntry}. */
    "utterances"?: SchemaValue<Text, "utterances">;
}
interface HyperTocEntryLeaf extends HyperTocEntryBase {
    "@type": "HyperTocEntry";
}
/** A HyperToEntry is an item within a {@link https://schema.org/HyperToc HyperToc}, which represents a hypertext table of contents for complex media objects, such as {@link https://schema.org/VideoObject VideoObject}, {@link https://schema.org/AudioObject AudioObject}. The media object itself is indicated using {@link https://schema.org/associatedMedia associatedMedia}. Each section of interest within that content can be described with a {@link https://schema.org/HyperTocEntry HyperTocEntry}, with associated {@link https://schema.org/startOffset startOffset} and {@link https://schema.org/endOffset endOffset}. When several entries are all from the same file, {@link https://schema.org/associatedMedia associatedMedia} is used on the overarching {@link https://schema.org/HyperTocEntry HyperTocEntry}; if the content has been split into multiple files, they can be referenced using {@link https://schema.org/associatedMedia associatedMedia} on each {@link https://schema.org/HyperTocEntry HyperTocEntry}. */
export type HyperTocEntry = HyperTocEntryLeaf;
interface IceCreamShopLeaf extends FoodEstablishmentBase {
    "@type": "IceCreamShop";
}
/** An ice cream shop. */
export type IceCreamShop = IceCreamShopLeaf | string;
interface IgnoreActionLeaf extends ActionBase {
    "@type": "IgnoreAction";
}
/** The act of intentionally disregarding the object. An agent ignores an object. */
export type IgnoreAction = IgnoreActionLeaf;
interface ImageGalleryLeaf extends WebPageBase {
    "@type": "ImageGallery";
}
/** Web page type: Image gallery page. */
export type ImageGallery = ImageGalleryLeaf;
interface ImageObjectBase extends MediaObjectBase {
    /** The caption for this object. For downloadable machine formats (closed caption, subtitles etc.) use MediaObject and indicate the {@link https://schema.org/encodingFormat encodingFormat}. */
    "caption"?: SchemaValue<MediaObject | Text | IdReference, "caption">;
    /** Represents textual captioning from a {@link https://schema.org/MediaObject MediaObject}, e.g. text of a 'meme'. */
    "embeddedTextCaption"?: SchemaValue<Text, "embeddedTextCaption">;
    /** exif data for this object. */
    "exifData"?: SchemaValue<PropertyValue | Text | IdReference, "exifData">;
    /** Indicates whether this image is representative of the content of the page. */
    "representativeOfPage"?: SchemaValue<Boolean, "representativeOfPage">;
}
interface ImageObjectLeaf extends ImageObjectBase {
    "@type": "ImageObject";
}
/** An image file. */
export type ImageObject = ImageObjectLeaf | Barcode | ImageObjectSnapshot;
interface ImageObjectSnapshotLeaf extends ImageObjectBase {
    "@type": "ImageObjectSnapshot";
}
/** A specific and exact (byte-for-byte) version of an {@link https://schema.org/ImageObject ImageObject}. Two byte-for-byte identical files, for the purposes of this type, considered identical. If they have different embedded metadata (e.g. XMP, EXIF) the files will differ. Different external facts about the files, e.g. creator or dateCreated that aren't represented in their actual content, do not affect this notion of identity. */
export type ImageObjectSnapshot = ImageObjectSnapshotLeaf;
interface ImagingTestBase extends MedicalTestBase {
    /** Imaging technique used. */
    "imagingTechnique"?: SchemaValue<MedicalImagingTechnique | IdReference, "imagingTechnique">;
}
interface ImagingTestLeaf extends ImagingTestBase {
    "@type": "ImagingTest";
}
/** Any medical imaging modality typically used for diagnostic purposes. */
export type ImagingTest = ImagingTestLeaf;
interface IndividualPhysicianBase extends PhysicianBase {
    /** A {@link https://schema.org/MedicalOrganization MedicalOrganization} where the {@link https://schema.org/IndividualPhysician IndividualPhysician} practices. */
    "practicesAt"?: SchemaValue<MedicalOrganization | IdReference, "practicesAt">;
}
interface IndividualPhysicianLeaf extends IndividualPhysicianBase {
    "@type": "IndividualPhysician";
}
/** An individual medical practitioner. For their official address use {@link https://schema.org/address address}, for affiliations to hospitals use {@link https://schema.org/hospitalAffiliation hospitalAffiliation}. The {@link https://schema.org/practicesAt practicesAt} property can be used to indicate {@link https://schema.org/MedicalOrganization MedicalOrganization} hospitals, clinics, pharmacies etc. where this physician practices. */
export type IndividualPhysician = IndividualPhysicianLeaf | string;
interface IndividualProductBase extends ProductBase {
    /** The serial number or any alphanumeric identifier of a particular product. When attached to an offer, it is a shortcut for the serial number of the product included in the offer. */
    "serialNumber"?: SchemaValue<Text, "serialNumber">;
}
interface IndividualProductLeaf extends IndividualProductBase {
    "@type": "IndividualProduct";
}
/** A single, identifiable product instance (e.g. a laptop with a particular serial number). */
export type IndividualProduct = IndividualProductLeaf;
interface InfectiousAgentClassLeaf extends EnumerationBase {
    "@type": "InfectiousAgentClass";
}
/** Classes of agents or pathogens that transmit infectious diseases. Enumerated type. */
export type InfectiousAgentClass = "https://schema.org/Bacteria" | "Bacteria" | "https://schema.org/Fungus" | "Fungus" | "https://schema.org/MulticellularParasite" | "MulticellularParasite" | "https://schema.org/Prion" | "Prion" | "https://schema.org/Protozoa" | "Protozoa" | "https://schema.org/Virus" | "Virus" | InfectiousAgentClassLeaf;
interface InfectiousDiseaseBase extends MedicalConditionBase {
    /** The actual infectious agent, such as a specific bacterium. */
    "infectiousAgent"?: SchemaValue<Text, "infectiousAgent">;
    /** The class of infectious agent (bacteria, prion, etc.) that causes the disease. */
    "infectiousAgentClass"?: SchemaValue<InfectiousAgentClass | IdReference, "infectiousAgentClass">;
    /** How the disease spreads, either as a route or vector, for example 'direct contact', 'Aedes aegypti', etc. */
    "transmissionMethod"?: SchemaValue<Text, "transmissionMethod">;
}
interface InfectiousDiseaseLeaf extends InfectiousDiseaseBase {
    "@type": "InfectiousDisease";
}
/** An infectious disease is a clinically evident human disease resulting from the presence of pathogenic microbial agents, like pathogenic viruses, pathogenic bacteria, fungi, protozoa, multicellular parasites, and prions. To be considered an infectious disease, such pathogens are known to be able to cause this disease. */
export type InfectiousDisease = InfectiousDiseaseLeaf;
interface InformActionBase extends CommunicateActionBase {
    /** Upcoming or past event associated with this place, organization, or action. */
    "event"?: SchemaValue<Event | IdReference, "event">;
}
interface InformActionLeaf extends InformActionBase {
    "@type": "InformAction";
}
/** The act of notifying someone of information pertinent to them, with no expectation of a response. */
export type InformAction = InformActionLeaf | ConfirmAction | RsvpAction;
interface InsertActionBase extends UpdateActionBase {
    /** A sub property of location. The final location of the object or the agent after the action. */
    "toLocation"?: SchemaValue<Place | IdReference, "toLocation">;
}
interface InsertActionLeaf extends InsertActionBase {
    "@type": "InsertAction";
}
/** The act of adding at a specific location in an ordered collection. */
export type InsertAction = InsertActionLeaf | AppendAction | PrependAction;
interface InstallActionLeaf extends ConsumeActionBase {
    "@type": "InstallAction";
}
/** The act of installing an application. */
export type InstallAction = InstallActionLeaf;
interface InsuranceAgencyLeaf extends FinancialServiceBase {
    "@type": "InsuranceAgency";
}
/** An Insurance agency. */
export type InsuranceAgency = InsuranceAgencyLeaf | string;
interface IntangibleLeaf extends ThingBase {
    "@type": "Intangible";
}
/** A utility class that serves as the umbrella for a number of 'intangible' things such as quantities, structured values, etc. */
export type Intangible = IntangibleLeaf | ActionAccessSpecification | AlignmentObject | Audience | BedDetails | Brand | BroadcastChannel | BroadcastFrequencySpecification | Class | ComputerLanguage | ConstraintNode | DataFeedItem | DefinedTerm | Demand | DigitalDocumentPermission | EducationalOccupationalProgram | EnergyConsumptionDetails | EntryPoint | Enumeration | FloorPlan | GameServer | GeospatialGeometry | Grant | HealthInsurancePlan | HealthPlanCostSharingSpecification | HealthPlanFormulary | HealthPlanNetwork | Invoice | ItemList | JobPosting | Language | ListItem | MediaSubscription | MemberProgram | MemberProgramTier | MenuItem | MerchantReturnPolicy | MerchantReturnPolicySeasonalOverride | Observation | Occupation | OccupationalExperienceRequirements | Offer | Order | OrderItem | ParcelDelivery | PaymentMethod | Permit | ProductReturnPolicy | ProgramMembership | Property | PropertyValueSpecification | Quantity | Rating | Reservation | Role | Schedule | Seat | Series | Service | ServiceChannel | SpeakableSpecification | StatisticalPopulation | StructuredValue | Ticket | Trip | VirtualLocation;
/** Data type: Integer. */
export type Integer = number | `${number}`;
interface InteractActionLeaf extends ActionBase {
    "@type": "InteractAction";
}
/** The act of interacting with another person or organization. */
export type InteractAction = InteractActionLeaf | BefriendAction | CommunicateAction | FollowAction | JoinAction | LeaveAction | MarryAction | RegisterAction | SubscribeAction | UnRegisterAction;
interface InteractionCounterBase extends ThingBase {
    /**
     * The endTime of something. For a reserved event or service (e.g. FoodEstablishmentReservation), the time that it is expected to end. For actions that span a period of time, when the action was performed. E.g. John wrote a book from January to _December_. For media, including audio and video, it's the time offset of the end of a clip within a larger file.
     *
     * Note that Event uses startDate/endDate instead of startTime/endTime, even when describing dates with times. This situation may be clarified in future revisions.
     */
    "endTime"?: SchemaValue<DateTime | Time, "endTime">;
    /** The WebSite or SoftwareApplication where the interactions took place. */
    "interactionService"?: SchemaValue<SoftwareApplication | WebSite | IdReference, "interactionService">;
    /** The Action representing the type of interaction. For up votes, +1s, etc. use {@link https://schema.org/LikeAction LikeAction}. For down votes use {@link https://schema.org/DislikeAction DislikeAction}. Otherwise, use the most specific Action. */
    "interactionType"?: SchemaValue<Action | IdReference, "interactionType">;
    /** The location of, for example, where an event is happening, where an organization is located, or where an action takes place. */
    "location"?: SchemaValue<Place | PostalAddress | Text | VirtualLocation | IdReference, "location">;
    /**
     * The startTime of something. For a reserved event or service (e.g. FoodEstablishmentReservation), the time that it is expected to start. For actions that span a period of time, when the action was performed. E.g. John wrote a book from _January_ to December. For media, including audio and video, it's the time offset of the start of a clip within a larger file.
     *
     * Note that Event uses startDate/endDate instead of startTime/endTime, even when describing dates with times. This situation may be clarified in future revisions.
     */
    "startTime"?: SchemaValue<DateTime | Time, "startTime">;
    /** The number of interactions for the CreativeWork using the WebSite or SoftwareApplication. */
    "userInteractionCount"?: SchemaValue<Integer, "userInteractionCount">;
}
interface InteractionCounterLeaf extends InteractionCounterBase {
    "@type": "InteractionCounter";
}
/** A summary of how users have interacted with this CreativeWork. In most cases, authors will use a subtype to specify the specific type of interaction. */
export type InteractionCounter = InteractionCounterLeaf;
interface InternetCafeLeaf extends LocalBusinessBase {
    "@type": "InternetCafe";
}
/** An internet cafe. */
export type InternetCafe = InternetCafeLeaf | string;
interface InvestmentFundLeaf extends InvestmentOrDepositBase {
    "@type": "InvestmentFund";
}
/** A company or fund that gathers capital from a number of investors to create a pool of money that is then re-invested into stocks, bonds and other assets. */
export type InvestmentFund = InvestmentFundLeaf;
interface InvestmentOrDepositBase extends FinancialProductBase {
    /** The amount of money. */
    "amount"?: SchemaValue<MonetaryAmount | Number | IdReference, "amount">;
}
interface InvestmentOrDepositLeaf extends InvestmentOrDepositBase {
    "@type": "InvestmentOrDeposit";
}
/** A type of financial product that typically requires the client to transfer funds to a financial service in return for potential beneficial financial return. */
export type InvestmentOrDeposit = InvestmentOrDepositLeaf | BrokerageAccount | DepositAccount | InvestmentFund;
interface InviteActionBase extends CommunicateActionBase {
    /** Upcoming or past event associated with this place, organization, or action. */
    "event"?: SchemaValue<Event | IdReference, "event">;
}
interface InviteActionLeaf extends InviteActionBase {
    "@type": "InviteAction";
}
/** The act of asking someone to attend an event. Reciprocal of RsvpAction. */
export type InviteAction = InviteActionLeaf;
interface InvoiceBase extends ThingBase {
    /** The identifier for the account the payment will be applied to. */
    "accountId"?: SchemaValue<Text, "accountId">;
    /** The time interval used to compute the invoice. */
    "billingPeriod"?: SchemaValue<Duration | IdReference, "billingPeriod">;
    /** An entity that arranges for an exchange between a buyer and a seller. In most cases a broker never acquires or releases ownership of a product or service involved in an exchange. If it is not clear whether an entity is a broker, seller, or buyer, the latter two terms are preferred. */
    "broker"?: SchemaValue<Organization | Person | IdReference, "broker">;
    /** A category for the item. Greater signs or slashes can be used to informally indicate a category hierarchy. */
    "category"?: SchemaValue<CategoryCode | PhysicalActivityCategory | Text | Thing | URL | IdReference, "category">;
    /** A number that confirms the given order or payment has been received. */
    "confirmationNumber"?: SchemaValue<Text, "confirmationNumber">;
    /** Party placing the order or paying the invoice. */
    "customer"?: SchemaValue<Organization | Person | IdReference, "customer">;
    /** The minimum payment required at this time. */
    "minimumPaymentDue"?: SchemaValue<MonetaryAmount | PriceSpecification | IdReference, "minimumPaymentDue">;
    /**
     * The date that payment is due.
     *
     * @deprecated Consider using https://schema.org/paymentDueDate instead.
     */
    "paymentDue"?: SchemaValue<DateTime, "paymentDue">;
    /** The date that payment is due. */
    "paymentDueDate"?: SchemaValue<Date | DateTime, "paymentDueDate">;
    /** The name of the credit card or other method of payment for the order. */
    "paymentMethod"?: SchemaValue<PaymentMethod | Text | IdReference, "paymentMethod">;
    /** An identifier for the method of payment used (e.g. the last 4 digits of the credit card). */
    "paymentMethodId"?: SchemaValue<Text, "paymentMethodId">;
    /** The status of payment; whether the invoice has been paid or not. */
    "paymentStatus"?: SchemaValue<PaymentStatusType | Text | IdReference, "paymentStatus">;
    /** The service provider, service operator, or service performer; the goods producer. Another party (a seller) may offer those services or goods on behalf of the provider. A provider may also serve as the seller. */
    "provider"?: SchemaValue<Organization | Person | IdReference, "provider">;
    /** The Order(s) related to this Invoice. One or more Orders may be combined into a single Invoice. */
    "referencesOrder"?: SchemaValue<Order | IdReference, "referencesOrder">;
    /** The date the invoice is scheduled to be paid. */
    "scheduledPaymentDate"?: SchemaValue<Date, "scheduledPaymentDate">;
    /** The total amount due. */
    "totalPaymentDue"?: SchemaValue<MonetaryAmount | PriceSpecification | IdReference, "totalPaymentDue">;
}
interface InvoiceLeaf extends InvoiceBase {
    "@type": "Invoice";
}
/** A statement of the money due for goods or services; a bill. */
export type Invoice = InvoiceLeaf;
interface IPTCDigitalSourceEnumerationLeaf extends EnumerationBase {
    "@type": "IPTCDigitalSourceEnumeration";
}
/** {@link https://www.iptc.org/ IPTC} "Digital Source" codes for use with the {@link https://schema.org/digitalSourceType digitalSourceType} property, providing information about the source for a digital media object. In general these codes are not declared here to be mutually exclusive, although some combinations would be contradictory if applied simultaneously, or might be considered mutually incompatible by upstream maintainers of the definitions. See the IPTC {@link https://www.iptc.org/std/photometadata/documentation/userguide/ documentation} for {@link https://cv.iptc.org/newscodes/digitalsourcetype/ detailed definitions} of all terms. */
export type IPTCDigitalSourceEnumeration = "https://schema.org/AlgorithmicallyEnhancedDigitalSource" | "AlgorithmicallyEnhancedDigitalSource" | "https://schema.org/AlgorithmicMediaDigitalSource" | "AlgorithmicMediaDigitalSource" | "https://schema.org/CompositeCaptureDigitalSource" | "CompositeCaptureDigitalSource" | "https://schema.org/CompositeDigitalSource" | "CompositeDigitalSource" | "https://schema.org/CompositeSyntheticDigitalSource" | "CompositeSyntheticDigitalSource" | "https://schema.org/CompositeWithTrainedAlgorithmicMediaDigitalSource" | "CompositeWithTrainedAlgorithmicMediaDigitalSource" | "https://schema.org/DataDrivenMediaDigitalSource" | "DataDrivenMediaDigitalSource" | "https://schema.org/DigitalArtDigitalSource" | "DigitalArtDigitalSource" | "https://schema.org/DigitalCaptureDigitalSource" | "DigitalCaptureDigitalSource" | "https://schema.org/MinorHumanEditsDigitalSource" | "MinorHumanEditsDigitalSource" | "https://schema.org/MultiFrameComputationalCaptureDigitalSource" | "MultiFrameComputationalCaptureDigitalSource" | "https://schema.org/NegativeFilmDigitalSource" | "NegativeFilmDigitalSource" | "https://schema.org/PositiveFilmDigitalSource" | "PositiveFilmDigitalSource" | "https://schema.org/PrintDigitalSource" | "PrintDigitalSource" | "https://schema.org/ScreenCaptureDigitalSource" | "ScreenCaptureDigitalSource" | "https://schema.org/TrainedAlgorithmicMediaDigitalSource" | "TrainedAlgorithmicMediaDigitalSource" | "https://schema.org/VirtualRecordingDigitalSource" | "VirtualRecordingDigitalSource" | IPTCDigitalSourceEnumerationLeaf;
interface ItemAvailabilityLeaf extends EnumerationBase {
    "@type": "ItemAvailability";
}
/** A list of possible product availability options. */
export type ItemAvailability = "https://schema.org/BackOrder" | "BackOrder" | "https://schema.org/Discontinued" | "Discontinued" | "https://schema.org/InStock" | "InStock" | "https://schema.org/InStoreOnly" | "InStoreOnly" | "https://schema.org/LimitedAvailability" | "LimitedAvailability" | "https://schema.org/MadeToOrder" | "MadeToOrder" | "https://schema.org/OnlineOnly" | "OnlineOnly" | "https://schema.org/OutOfStock" | "OutOfStock" | "https://schema.org/PreOrder" | "PreOrder" | "https://schema.org/PreSale" | "PreSale" | "https://schema.org/Reserved" | "Reserved" | "https://schema.org/SoldOut" | "SoldOut" | ItemAvailabilityLeaf;
interface ItemListBase extends ThingBase {
    /**
     * For itemListElement values, you can use simple strings (e.g. "Peter", "Paul", "Mary"), existing entities, or use ListItem.
     *
     * Text values are best if the elements in the list are plain strings. Existing entities are best for a simple, unordered list of existing things in your data. ListItem is used with ordered lists when you want to provide additional context about the element in that list or when the same item might be in different places in different lists.
     *
     * Note: The order of elements in your mark-up is not sufficient for indicating the order or elements. Use ListItem with a 'position' property in such cases.
     */
    "itemListElement"?: SchemaValue<ListItem | Text | Thing | IdReference, "itemListElement">;
    /** Type of ordering (e.g. Ascending, Descending, Unordered). */
    "itemListOrder"?: SchemaValue<ItemListOrderType | Text | IdReference, "itemListOrder">;
    /** The number of items in an ItemList. Note that some descriptions might not fully describe all items in a list (e.g., multi-page pagination); in such cases, the numberOfItems would be for the entire list. */
    "numberOfItems"?: SchemaValue<Integer, "numberOfItems">;
}
interface ItemListLeaf extends ItemListBase {
    "@type": "ItemList";
}
/** A list of items of any sort—for example, Top 10 Movies About Weathermen, or Top 100 Party Songs. Not to be confused with HTML lists, which are often used only for formatting. */
export type ItemList = ItemListLeaf | BreadcrumbList | HowToSection | HowToStep | OfferCatalog;
interface ItemListOrderTypeLeaf extends EnumerationBase {
    "@type": "ItemListOrderType";
}
/** Enumerated for values for itemListOrder for indicating how an ordered ItemList is organized. */
export type ItemListOrderType = "https://schema.org/ItemListOrderAscending" | "ItemListOrderAscending" | "https://schema.org/ItemListOrderDescending" | "ItemListOrderDescending" | "https://schema.org/ItemListUnordered" | "ItemListUnordered" | ItemListOrderTypeLeaf;
interface ItemPageLeaf extends WebPageBase {
    "@type": "ItemPage";
}
/** A page devoted to a single item, such as a particular product or hotel. */
export type ItemPage = ItemPageLeaf;
interface JewelryStoreLeaf extends LocalBusinessBase {
    "@type": "JewelryStore";
}
/** A jewelry store. */
export type JewelryStore = JewelryStoreLeaf | string;
interface JobPostingBase extends ThingBase {
    /** The location(s) applicants can apply from. This is usually used for telecommuting jobs where the applicant does not need to be in a physical office. Note: This should not be used for citizenship or work visa requirements. */
    "applicantLocationRequirements"?: SchemaValue<AdministrativeArea | IdReference, "applicantLocationRequirements">;
    /** Contact details for further information relevant to this job posting. */
    "applicationContact"?: SchemaValue<ContactPoint | IdReference, "applicationContact">;
    /** The base salary of the job or of an employee in an EmployeeRole. */
    "baseSalary"?: SchemaValue<MonetaryAmount | Number | PriceSpecification | IdReference, "baseSalary">;
    /**
     * Description of benefits associated with the job.
     *
     * @deprecated Consider using https://schema.org/jobBenefits instead.
     */
    "benefits"?: SchemaValue<Text, "benefits">;
    /** Publication date of an online listing. */
    "datePosted"?: SchemaValue<Date | DateTime, "datePosted">;
    /** Indicates whether an {@link https://schema.org/url url} that is associated with a {@link https://schema.org/JobPosting JobPosting} enables direct application for the job, via the posting website. A job posting is considered to have directApply of {@link https://schema.org/True True} if an application process for the specified job can be directly initiated via the url(s) given (noting that e.g. multiple internet domains might nevertheless be involved at an implementation level). A value of {@link https://schema.org/False False} is appropriate if there is no clear path to applying directly online for the specified job, navigating directly from the JobPosting url(s) supplied. */
    "directApply"?: SchemaValue<Boolean, "directApply">;
    /** Educational background needed for the position or Occupation. */
    "educationRequirements"?: SchemaValue<EducationalOccupationalCredential | Text | IdReference, "educationRequirements">;
    /** The legal requirements such as citizenship, visa and other documentation required for an applicant to this job. */
    "eligibilityToWorkRequirement"?: SchemaValue<Text, "eligibilityToWorkRequirement">;
    /** A description of the employer, career opportunities and work environment for this position. */
    "employerOverview"?: SchemaValue<Text, "employerOverview">;
    /** Type of employment (e.g. full-time, part-time, contract, temporary, seasonal, internship). */
    "employmentType"?: SchemaValue<Text, "employmentType">;
    /** Indicates the department, unit and/or facility where the employee reports and/or in which the job is to be performed. */
    "employmentUnit"?: SchemaValue<Organization | IdReference, "employmentUnit">;
    /** An estimated salary for a job posting or occupation, based on a variety of variables including, but not limited to industry, job title, and location. Estimated salaries are often computed by outside organizations rather than the hiring organization, who may not have committed to the estimated value. */
    "estimatedSalary"?: SchemaValue<MonetaryAmount | MonetaryAmountDistribution | Number | IdReference, "estimatedSalary">;
    /** Indicates whether a {@link https://schema.org/JobPosting JobPosting} will accept experience (as indicated by {@link https://schema.org/OccupationalExperienceRequirements OccupationalExperienceRequirements}) in place of its formal educational qualifications (as indicated by {@link https://schema.org/educationRequirements educationRequirements}). If true, indicates that satisfying one of these requirements is sufficient. */
    "experienceInPlaceOfEducation"?: SchemaValue<Boolean, "experienceInPlaceOfEducation">;
    /** Description of skills and experience needed for the position or Occupation. */
    "experienceRequirements"?: SchemaValue<OccupationalExperienceRequirements | Text | IdReference, "experienceRequirements">;
    /** Organization or Person offering the job position. */
    "hiringOrganization"?: SchemaValue<Organization | Person | IdReference, "hiringOrganization">;
    /** Description of bonus and commission compensation aspects of the job. */
    "incentiveCompensation"?: SchemaValue<Text, "incentiveCompensation">;
    /**
     * Description of bonus and commission compensation aspects of the job.
     *
     * @deprecated Consider using https://schema.org/incentiveCompensation instead.
     */
    "incentives"?: SchemaValue<Text, "incentives">;
    /** The industry associated with the job position. */
    "industry"?: SchemaValue<DefinedTerm | Text | IdReference, "industry">;
    /** Description of benefits associated with the job. */
    "jobBenefits"?: SchemaValue<Text, "jobBenefits">;
    /** An indicator as to whether a position is available for an immediate start. */
    "jobImmediateStart"?: SchemaValue<Boolean, "jobImmediateStart">;
    /** A (typically single) geographic location associated with the job position. */
    "jobLocation"?: SchemaValue<Place | IdReference, "jobLocation">;
    /** A description of the job location (e.g. TELECOMMUTE for telecommute jobs). */
    "jobLocationType"?: SchemaValue<Text, "jobLocationType">;
    /** The date on which a successful applicant for this job would be expected to start work. Choose a specific date in the future or use the jobImmediateStart property to indicate the position is to be filled as soon as possible. */
    "jobStartDate"?: SchemaValue<Date | Text, "jobStartDate">;
    /**
     * A category describing the job, preferably using a term from a taxonomy such as {@link http://www.onetcenter.org/taxonomy.html BLS O*NET-SOC}, {@link https://www.ilo.org/public/english/bureau/stat/isco/isco08/ ISCO-08} or similar, with the property repeated for each applicable value. Ideally the taxonomy should be identified, and both the textual label and formal code for the category should be provided.
     *
     * Note: for historical reasons, any textual label and formal code provided as a literal may be assumed to be from O*NET-SOC.
     */
    "occupationalCategory"?: SchemaValue<CategoryCode | Text | IdReference, "occupationalCategory">;
    /** A description of the types of physical activity associated with the job. Defined terms such as those in O*net may be used, but note that there is no way to specify the level of ability as well as its nature when using a defined term. */
    "physicalRequirement"?: SchemaValue<DefinedTerm | Text | URL | IdReference, "physicalRequirement">;
    /** Specific qualifications required for this role or Occupation. */
    "qualifications"?: SchemaValue<EducationalOccupationalCredential | Text | IdReference, "qualifications">;
    /** The Occupation for the JobPosting. */
    "relevantOccupation"?: SchemaValue<Occupation | IdReference, "relevantOccupation">;
    /** Responsibilities associated with this role or Occupation. */
    "responsibilities"?: SchemaValue<Text, "responsibilities">;
    /** The currency (coded using {@link http://en.wikipedia.org/wiki/ISO_4217 ISO 4217}) used for the main salary information in this job posting or for this employee. */
    "salaryCurrency"?: SchemaValue<Text, "salaryCurrency">;
    /** A description of any security clearance requirements of the job. */
    "securityClearanceRequirement"?: SchemaValue<Text | URL, "securityClearanceRequirement">;
    /** A description of any sensory requirements and levels necessary to function on the job, including hearing and vision. Defined terms such as those in O*net may be used, but note that there is no way to specify the level of ability as well as its nature when using a defined term. */
    "sensoryRequirement"?: SchemaValue<DefinedTerm | Text | URL | IdReference, "sensoryRequirement">;
    /** A statement of knowledge, skill, ability, task or any other assertion expressing a competency that is either claimed by a person, an organization or desired or required to fulfill a role or to work in an occupation. */
    "skills"?: SchemaValue<DefinedTerm | Text | IdReference, "skills">;
    /** Any special commitments associated with this job posting. Valid entries include VeteranCommit, MilitarySpouseCommit, etc. */
    "specialCommitments"?: SchemaValue<Text, "specialCommitments">;
    /** The title of the job. */
    "title"?: SchemaValue<Text, "title">;
    /** The number of positions open for this job posting. Use a positive integer. Do not use if the number of positions is unclear or not known. */
    "totalJobOpenings"?: SchemaValue<Integer, "totalJobOpenings">;
    /** The date after when the item is not valid. For example the end of an offer, salary period, or a period of opening hours. */
    "validThrough"?: SchemaValue<Date | DateTime, "validThrough">;
    /** The typical working hours for this job (e.g. 1st shift, night shift, 8am-5pm). */
    "workHours"?: SchemaValue<Text, "workHours">;
}
interface JobPostingLeaf extends JobPostingBase {
    "@type": "JobPosting";
}
/** A listing that describes a job opening in a certain organization. */
export type JobPosting = JobPostingLeaf;
interface JoinActionBase extends ActionBase {
    /** Upcoming or past event associated with this place, organization, or action. */
    "event"?: SchemaValue<Event | IdReference, "event">;
}
interface JoinActionLeaf extends JoinActionBase {
    "@type": "JoinAction";
}
/**
 * An agent joins an event/group with participants/friends at a location.
 *
 * Related actions:
 * - {@link https://schema.org/RegisterAction RegisterAction}: Unlike RegisterAction, JoinAction refers to joining a group/team of people.
 * - {@link https://schema.org/SubscribeAction SubscribeAction}: Unlike SubscribeAction, JoinAction does not imply that you'll be receiving updates.
 * - {@link https://schema.org/FollowAction FollowAction}: Unlike FollowAction, JoinAction does not imply that you'll be polling for updates.
 */
export type JoinAction = JoinActionLeaf;
interface JointBase extends AnatomicalStructureBase {
    /** The biomechanical properties of the bone. */
    "biomechnicalClass"?: SchemaValue<Text, "biomechnicalClass">;
    /** The degree of mobility the joint allows. */
    "functionalClass"?: SchemaValue<MedicalEntity | Text | IdReference, "functionalClass">;
    /** The name given to how bone physically connects to each other. */
    "structuralClass"?: SchemaValue<Text, "structuralClass">;
}
interface JointLeaf extends JointBase {
    "@type": "Joint";
}
/** The anatomical location at which two or more bones make contact. */
export type Joint = JointLeaf;
interface LakeBodyOfWaterLeaf extends PlaceBase {
    "@type": "LakeBodyOfWater";
}
/** A lake (for example, Lake Pontrachain). */
export type LakeBodyOfWater = LakeBodyOfWaterLeaf | string;
interface LandformLeaf extends PlaceBase {
    "@type": "Landform";
}
/** A landform or physical feature. Landform elements include mountains, plains, lakes, rivers, seascape and oceanic waterbody interface features such as bays, peninsulas, seas and so forth, including sub-aqueous terrain features such as submersed mountain ranges, volcanoes, and the great ocean basins. */
export type Landform = LandformLeaf | BodyOfWater | Continent | Mountain | Volcano | string;
interface LandmarksOrHistoricalBuildingsLeaf extends PlaceBase {
    "@type": "LandmarksOrHistoricalBuildings";
}
/** An historical landmark or building. */
export type LandmarksOrHistoricalBuildings = LandmarksOrHistoricalBuildingsLeaf | string;
interface LanguageLeaf extends ThingBase {
    "@type": "Language";
}
/** Natural languages such as Spanish, Tamil, Hindi, English, etc. Formal language code tags expressed in {@link https://en.wikipedia.org/wiki/IETF_language_tag BCP 47} can be used via the {@link https://schema.org/alternateName alternateName} property. The Language type previously also covered programming languages such as Scheme and Lisp, which are now best represented using {@link https://schema.org/ComputerLanguage ComputerLanguage}. */
export type Language = LanguageLeaf;
interface LearningResourceBase extends CreativeWorkBase {
    /** The item being described is intended to assess the competency or learning outcome defined by the referenced term. */
    "assesses"?: SchemaValue<DefinedTerm | Text | IdReference, "assesses">;
    /** Knowledge, skill, ability or personal attribute that must be demonstrated by a person or other entity in order to do something such as earn an Educational Occupational Credential or understand a LearningResource. */
    "competencyRequired"?: SchemaValue<DefinedTerm | Text | URL | IdReference, "competencyRequired">;
    /**
     * An alignment to an established educational framework.
     *
     * This property should not be used where the nature of the alignment can be described using a simple property, for example to express that a resource {@link https://schema.org/teaches teaches} or {@link https://schema.org/assesses assesses} a competency.
     */
    "educationalAlignment"?: SchemaValue<AlignmentObject | IdReference, "educationalAlignment">;
    /** The level in terms of progression through an educational or training context. Examples of educational levels include 'beginner', 'intermediate' or 'advanced', and formal sets of level indicators. */
    "educationalLevel"?: SchemaValue<DefinedTerm | Text | URL | IdReference, "educationalLevel">;
    /** The purpose of a work in the context of education; for example, 'assignment', 'group work'. */
    "educationalUse"?: SchemaValue<DefinedTerm | Text | IdReference, "educationalUse">;
    /** The predominant type or kind characterizing the learning resource. For example, 'presentation', 'handout'. */
    "learningResourceType"?: SchemaValue<DefinedTerm | Text | IdReference, "learningResourceType">;
    /** The item being described is intended to help a person learn the competency or learning outcome defined by the referenced term. */
    "teaches"?: SchemaValue<DefinedTerm | Text | IdReference, "teaches">;
}
interface LearningResourceLeaf extends LearningResourceBase {
    "@type": "LearningResource";
}
/**
 * The LearningResource type can be used to indicate {@link https://schema.org/CreativeWork CreativeWork}s (whether physical or digital) that have a particular and explicit orientation towards learning, education, skill acquisition, and other educational purposes.
 *
 * {@link https://schema.org/LearningResource LearningResource} is expected to be used as an addition to a primary type such as {@link https://schema.org/Book Book}, {@link https://schema.org/VideoObject VideoObject}, {@link https://schema.org/Product Product} etc.
 *
 * {@link https://schema.org/EducationEvent EducationEvent} serves a similar purpose for event-like things (e.g. a {@link https://schema.org/Trip Trip}). A {@link https://schema.org/LearningResource LearningResource} may be created as a result of an {@link https://schema.org/EducationEvent EducationEvent}, for example by recording one.
 */
export type LearningResource = LearningResourceLeaf | Course | Quiz | Syllabus;
interface LeaveActionBase extends ActionBase {
    /** Upcoming or past event associated with this place, organization, or action. */
    "event"?: SchemaValue<Event | IdReference, "event">;
}
interface LeaveActionLeaf extends LeaveActionBase {
    "@type": "LeaveAction";
}
/**
 * An agent leaves an event / group with participants/friends at a location.
 *
 * Related actions:
 * - {@link https://schema.org/JoinAction JoinAction}: The antonym of LeaveAction.
 * - {@link https://schema.org/UnRegisterAction UnRegisterAction}: Unlike UnRegisterAction, LeaveAction implies leaving a group/team of people rather than a service.
 */
export type LeaveAction = LeaveActionLeaf;
interface LegalForceStatusLeaf extends EnumerationBase {
    "@type": "LegalForceStatus";
}
/** A list of possible statuses for the legal force of a legislation. */
export type LegalForceStatus = "https://schema.org/InForce" | "InForce" | "https://schema.org/NotInForce" | "NotInForce" | "https://schema.org/PartiallyInForce" | "PartiallyInForce" | LegalForceStatusLeaf;
interface LegalServiceLeaf extends LocalBusinessBase {
    "@type": "LegalService";
}
/**
 * A LegalService is a business that provides legally-oriented services, advice and representation, e.g. law firms.
 *
 * As a {@link https://schema.org/LocalBusiness LocalBusiness} it can be described as a {@link https://schema.org/provider provider} of one or more {@link https://schema.org/Service Service}(s).
 */
export type LegalService = LegalServiceLeaf | Attorney | Notary | string;
interface LegalValueLevelLeaf extends EnumerationBase {
    "@type": "LegalValueLevel";
}
/** A list of possible levels for the legal validity of a legislation. */
export type LegalValueLevel = "https://schema.org/AuthoritativeLegalValue" | "AuthoritativeLegalValue" | "https://schema.org/DefinitiveLegalValue" | "DefinitiveLegalValue" | "https://schema.org/OfficialLegalValue" | "OfficialLegalValue" | "https://schema.org/UnofficialLegalValue" | "UnofficialLegalValue" | LegalValueLevelLeaf;
interface LegislationBase extends CreativeWorkBase {
    /** Indicates a legal jurisdiction, e.g. of some legislation, or where some government service is based. */
    "jurisdiction"?: SchemaValue<AdministrativeArea | Text | IdReference, "jurisdiction">;
    /** Indicates that this legislation (or part of a legislation) somehow transfers another legislation in a different legislative context. This is an informative link, and it has no legal value. For legally-binding links of transposition, use the {@link /legislationTransposes legislationTransposes} property. For example an informative consolidated law of a European Union's member state "applies" the consolidated version of the European Directive implemented in it. */
    "legislationApplies"?: SchemaValue<Legislation | IdReference, "legislationApplies">;
    /** Another legislation that this legislation changes. This encompasses the notions of amendment, replacement, correction, repeal, or other types of change. This may be a direct change (textual or non-textual amendment) or a consequential or indirect change. The property is to be used to express the existence of a change relationship between two acts rather than the existence of a consolidated version of the text that shows the result of the change. For consolidation relationships, use the {@link /legislationConsolidates legislationConsolidates} property. */
    "legislationChanges"?: SchemaValue<Legislation | IdReference, "legislationChanges">;
    /** Indicates another legislation taken into account in this consolidated legislation (which is usually the product of an editorial process that revises the legislation). This property should be used multiple times to refer to both the original version or the previous consolidated version, and to the legislations making the change. */
    "legislationConsolidates"?: SchemaValue<Legislation | IdReference, "legislationConsolidates">;
    /** The date of adoption or signature of the legislation. This is the date at which the text is officially aknowledged to be a legislation, even though it might not even be published or in force. */
    "legislationDate"?: SchemaValue<Date, "legislationDate">;
    /** The point-in-time at which the provided description of the legislation is valid (e.g.: when looking at the law on the 2016-04-07 (= dateVersion), I get the consolidation of 2015-04-12 of the "National Insurance Contributions Act 2015") */
    "legislationDateVersion"?: SchemaValue<Date, "legislationDateVersion">;
    /** An identifier for the legislation. This can be either a string-based identifier, like the CELEX at EU level or the NOR in France, or a web-based, URL/URI identifier, like an ELI (European Legislation Identifier) or an URN-Lex. */
    "legislationIdentifier"?: SchemaValue<Text | URL, "legislationIdentifier">;
    /** The jurisdiction from which the legislation originates. */
    "legislationJurisdiction"?: SchemaValue<AdministrativeArea | Text | IdReference, "legislationJurisdiction">;
    /** Whether the legislation is currently in force, not in force, or partially in force. */
    "legislationLegalForce"?: SchemaValue<LegalForceStatus | IdReference, "legislationLegalForce">;
    /** The person or organization that originally passed or made the law: typically parliament (for primary legislation) or government (for secondary legislation). This indicates the "legal author" of the law, as opposed to its physical author. */
    "legislationPassedBy"?: SchemaValue<Organization | Person | IdReference, "legislationPassedBy">;
    /** An individual or organization that has some kind of responsibility for the legislation. Typically the ministry who is/was in charge of elaborating the legislation, or the adressee for potential questions about the legislation once it is published. */
    "legislationResponsible"?: SchemaValue<Organization | Person | IdReference, "legislationResponsible">;
    /** Indicates that this legislation (or part of legislation) fulfills the objectives set by another legislation, by passing appropriate implementation measures. Typically, some legislations of European Union's member states or regions transpose European Directives. This indicates a legally binding link between the 2 legislations. */
    "legislationTransposes"?: SchemaValue<Legislation | IdReference, "legislationTransposes">;
    /** The type of the legislation. Examples of values are "law", "act", "directive", "decree", "regulation", "statutory instrument", "loi organique", "règlement grand-ducal", etc., depending on the country. */
    "legislationType"?: SchemaValue<CategoryCode | Text | IdReference, "legislationType">;
}
interface LegislationLeaf extends LegislationBase {
    "@type": "Legislation";
}
/** A legal document such as an act, decree, bill, etc. (enforceable or not) or a component of a legal act (like an article). */
export type Legislation = LegislationLeaf | LegislationObject;
interface LegislationObjectBase extends MediaObjectBase, LegislationBase {
    /** The legal value of this legislation file. The same legislation can be written in multiple files with different legal values. Typically a digitally signed PDF have a "stronger" legal value than the HTML file of the same act. */
    "legislationLegalValue"?: SchemaValue<LegalValueLevel | IdReference, "legislationLegalValue">;
}
interface LegislationObjectLeaf extends LegislationObjectBase {
    "@type": "LegislationObject";
}
/** A specific object or file containing a Legislation. Note that the same Legislation can be published in multiple files. For example, a digitally signed PDF, a plain PDF and an HTML version. */
export type LegislationObject = LegislationObjectLeaf;
interface LegislativeBuildingLeaf extends CivicStructureBase {
    "@type": "LegislativeBuilding";
}
/** A legislative building—for example, the state capitol. */
export type LegislativeBuilding = LegislativeBuildingLeaf | string;
interface LendActionBase extends TransferActionBase {
    /** A sub property of participant. The person that borrows the object being lent. */
    "borrower"?: SchemaValue<Person | IdReference, "borrower">;
}
interface LendActionLeaf extends LendActionBase {
    "@type": "LendAction";
}
/**
 * The act of providing an object under an agreement that it will be returned at a later date. Reciprocal of BorrowAction.
 *
 * Related actions:
 * - {@link https://schema.org/BorrowAction BorrowAction}: Reciprocal of LendAction.
 */
export type LendAction = LendActionLeaf;
interface LibraryLeaf extends LocalBusinessBase {
    "@type": "Library";
}
/** A library. */
export type Library = LibraryLeaf | string;
interface LibrarySystemLeaf extends OrganizationBase {
    "@type": "LibrarySystem";
}
/** A {@link https://schema.org/LibrarySystem LibrarySystem} is a collaborative system amongst several libraries. */
export type LibrarySystem = LibrarySystemLeaf | string;
interface LifestyleModificationLeaf extends MedicalEntityBase {
    "@type": "LifestyleModification";
}
/** A process of care involving exercise, changes to diet, fitness routines, and other lifestyle changes aimed at improving a health condition. */
export type LifestyleModification = LifestyleModificationLeaf | Diet | PhysicalActivity;
interface LigamentLeaf extends AnatomicalStructureBase {
    "@type": "Ligament";
}
/** A short band of tough, flexible, fibrous connective tissue that functions to connect multiple bones, cartilages, and structurally support joints. */
export type Ligament = LigamentLeaf;
interface LikeActionLeaf extends ActionBase {
    "@type": "LikeAction";
}
/** The act of expressing a positive sentiment about the object. An agent likes an object (a proposition, topic or theme) with participants. */
export type LikeAction = LikeActionLeaf;
interface LiquorStoreLeaf extends LocalBusinessBase {
    "@type": "LiquorStore";
}
/** A shop that sells alcoholic drinks such as wine, beer, whisky and other spirits. */
export type LiquorStore = LiquorStoreLeaf | string;
interface ListenActionLeaf extends ConsumeActionBase {
    "@type": "ListenAction";
}
/** The act of consuming audio content. */
export type ListenAction = ListenActionLeaf;
interface ListItemBase extends ThingBase {
    /** An entity represented by an entry in a list or data feed (e.g. an 'artist' in a list of 'artists'). */
    "item"?: SchemaValue<Thing | IdReference, "item">;
    /** A link to the ListItem that follows the current one. */
    "nextItem"?: SchemaValue<ListItem | IdReference, "nextItem">;
    /** The position of an item in a series or sequence of items. */
    "position"?: SchemaValue<Integer | Text, "position">;
    /** A link to the ListItem that precedes the current one. */
    "previousItem"?: SchemaValue<ListItem | IdReference, "previousItem">;
}
interface ListItemLeaf extends ListItemBase {
    "@type": "ListItem";
}
/** An list item, e.g. a step in a checklist or how-to description. */
export type ListItem = ListItemLeaf | HowToDirection | HowToItem | HowToSection | HowToStep | HowToTip;
interface LiteraryEventLeaf extends EventBase {
    "@type": "LiteraryEvent";
}
/** Event type: Literary event. */
export type LiteraryEvent = LiteraryEventLeaf;
interface LiveBlogPostingBase extends SocialMediaPostingBase {
    /** The time when the live blog will stop covering the Event. Note that coverage may continue after the Event concludes. */
    "coverageEndTime"?: SchemaValue<DateTime, "coverageEndTime">;
    /** The time when the live blog will begin covering the Event. Note that coverage may begin before the Event's start time. The LiveBlogPosting may also be created before coverage begins. */
    "coverageStartTime"?: SchemaValue<DateTime, "coverageStartTime">;
    /** An update to the LiveBlog. */
    "liveBlogUpdate"?: SchemaValue<BlogPosting | IdReference, "liveBlogUpdate">;
}
interface LiveBlogPostingLeaf extends LiveBlogPostingBase {
    "@type": "LiveBlogPosting";
}
/** A {@link https://schema.org/LiveBlogPosting LiveBlogPosting} is a {@link https://schema.org/BlogPosting BlogPosting} intended to provide a rolling textual coverage of an ongoing event through continuous updates. */
export type LiveBlogPosting = LiveBlogPostingLeaf;
interface LoanOrCreditBase extends FinancialProductBase {
    /** The amount of money. */
    "amount"?: SchemaValue<MonetaryAmount | Number | IdReference, "amount">;
    /**
     * The currency in which the monetary amount is expressed.
     *
     * Use standard formats: {@link http://en.wikipedia.org/wiki/ISO_4217 ISO 4217 currency format}, e.g. "USD"; {@link https://en.wikipedia.org/wiki/List_of_cryptocurrencies Ticker symbol} for cryptocurrencies, e.g. "BTC"; well known names for {@link https://en.wikipedia.org/wiki/Local_exchange_trading_system Local Exchange Trading Systems} (LETS) and other currency types, e.g. "Ithaca HOUR".
     */
    "currency"?: SchemaValue<Text, "currency">;
    /** The period of time after any due date that the borrower has to fulfil its obligations before a default (failure to pay) is deemed to have occurred. */
    "gracePeriod"?: SchemaValue<Duration | IdReference, "gracePeriod">;
    /** A form of paying back money previously borrowed from a lender. Repayment usually takes the form of periodic payments that normally include part principal plus interest in each payment. */
    "loanRepaymentForm"?: SchemaValue<RepaymentSpecification | IdReference, "loanRepaymentForm">;
    /** The duration of the loan or credit agreement. */
    "loanTerm"?: SchemaValue<QuantitativeValue | IdReference, "loanTerm">;
    /** The type of a loan or credit. */
    "loanType"?: SchemaValue<Text | URL, "loanType">;
    /** The only way you get the money back in the event of default is the security. Recourse is where you still have the opportunity to go back to the borrower for the rest of the money. */
    "recourseLoan"?: SchemaValue<Boolean, "recourseLoan">;
    /** Whether the terms for payment of interest can be renegotiated during the life of the loan. */
    "renegotiableLoan"?: SchemaValue<Boolean, "renegotiableLoan">;
    /** Assets required to secure loan or credit repayments. It may take form of third party pledge, goods, financial instruments (cash, securities, etc.) */
    "requiredCollateral"?: SchemaValue<Text | Thing | IdReference, "requiredCollateral">;
}
interface LoanOrCreditLeaf extends LoanOrCreditBase {
    "@type": "LoanOrCredit";
}
/** A financial product for the loaning of an amount of money, or line of credit, under agreed terms and charges. */
export type LoanOrCredit = LoanOrCreditLeaf | CreditCard | MortgageLoan;
interface LocalBusinessBase extends OrganizationBase, PlaceBase {
    /**
     * The larger organization that this local business is a branch of, if any. Not to be confused with (anatomical) {@link https://schema.org/branch branch}.
     *
     * @deprecated Consider using https://schema.org/parentOrganization instead.
     */
    "branchOf"?: SchemaValue<Organization | IdReference, "branchOf">;
    /**
     * The currency accepted.
     *
     * Use standard formats: {@link http://en.wikipedia.org/wiki/ISO_4217 ISO 4217 currency format}, e.g. "USD"; {@link https://en.wikipedia.org/wiki/List_of_cryptocurrencies Ticker symbol} for cryptocurrencies, e.g. "BTC"; well known names for {@link https://en.wikipedia.org/wiki/Local_exchange_trading_system Local Exchange Trading Systems} (LETS) and other currency types, e.g. "Ithaca HOUR".
     */
    "currenciesAccepted"?: SchemaValue<Text, "currenciesAccepted">;
    /**
     * The general opening hours for a business. Opening hours can be specified as a weekly time range, starting with days, then times per day. Multiple days can be listed with commas ',' separating each day. Day or time ranges are specified using a hyphen '-'.
     * - Days are specified using the following two-letter combinations: `Mo`, `Tu`, `We`, `Th`, `Fr`, `Sa`, `Su`.
     * - Times are specified using 24:00 format. For example, 3pm is specified as `15:00`, 10am as `10:00`.
     * - Here is an example: `<time itemprop="openingHours" datetime="Tu,Th 16:00-20:00">Tuesdays and Thursdays 4-8pm</time>`.
     * - If a business is open 7 days a week, then it can be specified as `<time itemprop="openingHours" datetime="Mo-Su">Monday through Sunday, all day</time>`.
     */
    "openingHours"?: SchemaValue<Text, "openingHours">;
    /** Cash, Credit Card, Cryptocurrency, Local Exchange Tradings System, etc. */
    "paymentAccepted"?: SchemaValue<Text, "paymentAccepted">;
    /** The price range of the business, for example `$$$`. */
    "priceRange"?: SchemaValue<Text, "priceRange">;
}
interface LocalBusinessLeaf extends LocalBusinessBase {
    "@type": "LocalBusiness";
}
/** A particular physical business or branch of an organization. Examples of LocalBusiness include a restaurant, a particular branch of a restaurant chain, a branch of a bank, a medical practice, a club, a bowling alley, etc. */
export type LocalBusiness = LocalBusinessLeaf | AnimalShelter | ArchiveOrganization | AutomotiveBusiness | ChildCare | Dentist | DryCleaningOrLaundry | EmergencyService | EmploymentAgency | EntertainmentBusiness | FinancialService | FoodEstablishment | GovernmentOffice | HealthAndBeautyBusiness | HomeAndConstructionBusiness | InternetCafe | LegalService | Library | LodgingBusiness | MedicalBusiness | ProfessionalService | RadioStation | RealEstateAgent | RecyclingCenter | SelfStorage | ShoppingCenter | SportsActivityLocation | Store | TelevisionStation | TouristInformationCenter | TravelAgency | string;
interface LocationFeatureSpecificationBase extends PropertyValueBase {
    /** The hours during which this service or contact is available. */
    "hoursAvailable"?: SchemaValue<OpeningHoursSpecification | IdReference, "hoursAvailable">;
    /** The date when the item becomes valid. */
    "validFrom"?: SchemaValue<Date | DateTime, "validFrom">;
    /** The date after when the item is not valid. For example the end of an offer, salary period, or a period of opening hours. */
    "validThrough"?: SchemaValue<Date | DateTime, "validThrough">;
}
interface LocationFeatureSpecificationLeaf extends LocationFeatureSpecificationBase {
    "@type": "LocationFeatureSpecification";
}
/** Specifies a location feature by providing a structured value representing a feature of an accommodation as a property-value pair of varying degrees of formality. */
export type LocationFeatureSpecification = LocationFeatureSpecificationLeaf;
interface LocksmithLeaf extends LocalBusinessBase {
    "@type": "Locksmith";
}
/** A locksmith. */
export type Locksmith = LocksmithLeaf | string;
interface LodgingBusinessBase extends LocalBusinessBase {
    /** An amenity feature (e.g. a characteristic or service) of the Accommodation. This generic property does not make a statement about whether the feature is included in an offer for the main accommodation or available at extra costs. */
    "amenityFeature"?: SchemaValue<LocationFeatureSpecification | IdReference, "amenityFeature">;
    /** An intended audience, i.e. a group for whom something was created. */
    "audience"?: SchemaValue<Audience | IdReference, "audience">;
    /** A language someone may use with or at the item, service or place. Please use one of the language codes from the {@link http://tools.ietf.org/html/bcp47 IETF BCP 47 standard}. See also {@link https://schema.org/inLanguage inLanguage}. */
    "availableLanguage"?: SchemaValue<Language | Text | IdReference, "availableLanguage">;
    /** The earliest someone may check into a lodging establishment. */
    "checkinTime"?: SchemaValue<DateTime | Time, "checkinTime">;
    /** The latest someone may check out of a lodging establishment. */
    "checkoutTime"?: SchemaValue<DateTime | Time, "checkoutTime">;
    /** The number of rooms (excluding bathrooms and closets) of the accommodation or lodging business. Typical unit code(s): ROM for room or C62 for no unit. The type of room can be put in the unitText property of the QuantitativeValue. */
    "numberOfRooms"?: SchemaValue<Number | QuantitativeValue | IdReference, "numberOfRooms">;
    /** Indicates whether pets are allowed to enter the accommodation or lodging business. More detailed information can be put in a text value. */
    "petsAllowed"?: SchemaValue<Boolean | Text, "petsAllowed">;
    /** An official rating for a lodging business or food establishment, e.g. from national associations or standards bodies. Use the author property to indicate the rating organization, e.g. as an Organization with name such as (e.g. HOTREC, DEHOGA, WHR, or Hotelstars). */
    "starRating"?: SchemaValue<Rating | IdReference, "starRating">;
}
interface LodgingBusinessLeaf extends LodgingBusinessBase {
    "@type": "LodgingBusiness";
}
/** A lodging business, such as a motel, hotel, or inn. */
export type LodgingBusiness = LodgingBusinessLeaf | BedAndBreakfast | Campground | Hostel | Hotel | Motel | Resort | VacationRental | string;
interface LodgingReservationBase extends ReservationBase {
    /** The earliest someone may check into a lodging establishment. */
    "checkinTime"?: SchemaValue<DateTime | Time, "checkinTime">;
    /** The latest someone may check out of a lodging establishment. */
    "checkoutTime"?: SchemaValue<DateTime | Time, "checkoutTime">;
    /** A full description of the lodging unit. */
    "lodgingUnitDescription"?: SchemaValue<Text, "lodgingUnitDescription">;
    /** Textual description of the unit type (including suite vs. room, size of bed, etc.). */
    "lodgingUnitType"?: SchemaValue<QualitativeValue | Text | IdReference, "lodgingUnitType">;
    /** The number of adults staying in the unit. */
    "numAdults"?: SchemaValue<Integer | QuantitativeValue | IdReference, "numAdults">;
    /** The number of children staying in the unit. */
    "numChildren"?: SchemaValue<Integer | QuantitativeValue | IdReference, "numChildren">;
}
interface LodgingReservationLeaf extends LodgingReservationBase {
    "@type": "LodgingReservation";
}
/**
 * A reservation for lodging at a hotel, motel, inn, etc.
 *
 * Note: This type is for information about actual reservations, e.g. in confirmation emails or HTML pages with individual confirmations of reservations.
 */
export type LodgingReservation = LodgingReservationLeaf;
interface LoseActionBase extends ActionBase {
    /** A sub property of participant. The winner of the action. */
    "winner"?: SchemaValue<Person | IdReference, "winner">;
}
interface LoseActionLeaf extends LoseActionBase {
    "@type": "LoseAction";
}
/** The act of being defeated in a competitive activity. */
export type LoseAction = LoseActionLeaf;
interface LymphaticVesselBase extends AnatomicalStructureBase {
    /** The vasculature the lymphatic structure originates, or afferents, from. */
    "originatesFrom"?: SchemaValue<Vessel | IdReference, "originatesFrom">;
    /** The anatomical or organ system drained by this vessel; generally refers to a specific part of an organ. */
    "regionDrained"?: SchemaValue<AnatomicalStructure | AnatomicalSystem | IdReference, "regionDrained">;
    /** The vasculature the lymphatic structure runs, or efferents, to. */
    "runsTo"?: SchemaValue<Vessel | IdReference, "runsTo">;
}
interface LymphaticVesselLeaf extends LymphaticVesselBase {
    "@type": "LymphaticVessel";
}
/** A type of blood vessel that specifically carries lymph fluid unidirectionally toward the heart. */
export type LymphaticVessel = LymphaticVesselLeaf;
interface ManuscriptLeaf extends CreativeWorkBase {
    "@type": "Manuscript";
}
/** A book, document, or piece of music written by hand rather than typed or printed. */
export type Manuscript = ManuscriptLeaf;
interface MapBase extends CreativeWorkBase {
    /** Indicates the kind of Map, from the MapCategoryType Enumeration. */
    "mapType"?: SchemaValue<MapCategoryType | IdReference, "mapType">;
}
interface MapLeaf extends MapBase {
    "@type": "Map";
}
/** A map. */
export type Map = MapLeaf;
interface MapCategoryTypeLeaf extends EnumerationBase {
    "@type": "MapCategoryType";
}
/** An enumeration of several kinds of Map. */
export type MapCategoryType = "https://schema.org/ParkingMap" | "ParkingMap" | "https://schema.org/SeatingMap" | "SeatingMap" | "https://schema.org/TransitMap" | "TransitMap" | "https://schema.org/VenueMap" | "VenueMap" | MapCategoryTypeLeaf;
interface MarryActionLeaf extends ActionBase {
    "@type": "MarryAction";
}
/** The act of marrying a person. */
export type MarryAction = MarryActionLeaf;
interface MassLeaf extends ThingBase {
    "@type": "Mass";
}
/** Properties that take Mass as values are of the form '<Number> <Mass unit of measure>'. E.g., '7 kg'. */
export type Mass = MassLeaf | string;
interface MathSolverBase extends CreativeWorkBase {
    /** A mathematical expression (e.g. 'x^2-3x=0') that may be solved for a specific variable, simplified, or transformed. This can take many formats, e.g. LaTeX, Ascii-Math, or math as you would write with a keyboard. */
    "mathExpression"?: SchemaValue<SolveMathAction | Text | IdReference, "mathExpression">;
}
interface MathSolverLeaf extends MathSolverBase {
    "@type": "MathSolver";
}
/** A math solver which is capable of solving a subset of mathematical problems. */
export type MathSolver = MathSolverLeaf;
interface MaximumDoseScheduleLeaf extends DoseScheduleBase {
    "@type": "MaximumDoseSchedule";
}
/** The maximum dosing schedule considered safe for a drug or supplement as recommended by an authority or by the drug/supplement's manufacturer. Capture the recommending authority in the recognizingAuthority property of MedicalEntity. */
export type MaximumDoseSchedule = MaximumDoseScheduleLeaf;
interface MeasurementMethodEnumLeaf extends EnumerationBase {
    "@type": "MeasurementMethodEnum";
}
/** Enumeration(s) for use with {@link https://schema.org/measurementMethod measurementMethod}. */
export type MeasurementMethodEnum = "https://schema.org/ExampleMeasurementMethodEnum" | "ExampleMeasurementMethodEnum" | MeasurementMethodEnumLeaf;
interface MeasurementTypeEnumerationLeaf extends EnumerationBase {
    "@type": "MeasurementTypeEnumeration";
}
/** Enumeration of common measurement types (or dimensions), for example "chest" for a person, "inseam" for pants, "gauge" for screws, or "wheel" for bicycles. */
export type MeasurementTypeEnumeration = MeasurementTypeEnumerationLeaf | BodyMeasurementTypeEnumeration | WearableMeasurementTypeEnumeration;
interface MediaEnumerationLeaf extends EnumerationBase {
    "@type": "MediaEnumeration";
}
/** MediaEnumeration enumerations are lists of codes, labels etc. useful for describing media objects. They may be reflections of externally developed lists, or created at schema.org, or a combination. */
export type MediaEnumeration = MediaEnumerationLeaf | IPTCDigitalSourceEnumeration;
interface MediaGalleryLeaf extends WebPageBase {
    "@type": "MediaGallery";
}
/** Web page type: Media gallery page. A mixed-media page that can contain media such as images, videos, and other multimedia. */
export type MediaGallery = MediaGalleryLeaf | ImageGallery | VideoGallery;
interface MediaManipulationRatingEnumerationLeaf extends EnumerationBase {
    "@type": "MediaManipulationRatingEnumeration";
}
/** Codes for use with the {@link https://schema.org/mediaAuthenticityCategory mediaAuthenticityCategory} property, indicating the authenticity of a media object (in the context of how it was published or shared). In general these codes are not mutually exclusive, although some combinations (such as 'original' versus 'transformed', 'edited' and 'staged') would be contradictory if applied in the same {@link https://schema.org/MediaReview MediaReview}. Note that the application of these codes is with regard to a piece of media shared or published in a particular context. */
export type MediaManipulationRatingEnumeration = "https://schema.org/DecontextualizedContent" | "DecontextualizedContent" | "https://schema.org/EditedOrCroppedContent" | "EditedOrCroppedContent" | "https://schema.org/OriginalMediaContent" | "OriginalMediaContent" | "https://schema.org/SatireOrParodyContent" | "SatireOrParodyContent" | "https://schema.org/StagedContent" | "StagedContent" | "https://schema.org/TransformedContent" | "TransformedContent" | MediaManipulationRatingEnumerationLeaf;
interface MediaObjectBase extends CreativeWorkBase {
    /** A NewsArticle associated with the Media Object. */
    "associatedArticle"?: SchemaValue<NewsArticle | IdReference, "associatedArticle">;
    /** The bitrate of the media object. */
    "bitrate"?: SchemaValue<Text, "bitrate">;
    /** File size in (mega/kilo)bytes. */
    "contentSize"?: SchemaValue<Text, "contentSize">;
    /** Actual bytes of the media object, for example the image file or video file. */
    "contentUrl"?: SchemaValue<URL, "contentUrl">;
    /** The duration of the item (movie, audio recording, event, etc.) in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 duration format}. */
    "duration"?: SchemaValue<Duration | IdReference, "duration">;
    /** A URL pointing to a player for a specific video. In general, this is the information in the `src` element of an `embed` tag and should not be the same as the content of the `loc` tag. */
    "embedUrl"?: SchemaValue<URL, "embedUrl">;
    /** The CreativeWork encoded by this media object. */
    "encodesCreativeWork"?: SchemaValue<CreativeWork | IdReference, "encodesCreativeWork">;
    /**
     * Media type typically expressed using a MIME format (see {@link http://www.iana.org/assignments/media-types/media-types.xhtml IANA site} and {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types MDN reference}), e.g. application/zip for a SoftwareApplication binary, audio/mpeg for .mp3 etc.
     *
     * In cases where a {@link https://schema.org/CreativeWork CreativeWork} has several media type representations, {@link https://schema.org/encoding encoding} can be used to indicate each {@link https://schema.org/MediaObject MediaObject} alongside particular {@link https://schema.org/encodingFormat encodingFormat} information.
     *
     * Unregistered or niche encoding and file formats can be indicated instead via the most appropriate URL, e.g. defining Web page or a Wikipedia/Wikidata entry.
     */
    "encodingFormat"?: SchemaValue<Text | URL, "encodingFormat">;
    /**
     * The endTime of something. For a reserved event or service (e.g. FoodEstablishmentReservation), the time that it is expected to end. For actions that span a period of time, when the action was performed. E.g. John wrote a book from January to _December_. For media, including audio and video, it's the time offset of the end of a clip within a larger file.
     *
     * Note that Event uses startDate/endDate instead of startTime/endTime, even when describing dates with times. This situation may be clarified in future revisions.
     */
    "endTime"?: SchemaValue<DateTime | Time, "endTime">;
    /** The height of the item. */
    "height"?: SchemaValue<Distance | QuantitativeValue | IdReference, "height">;
    /**
     * The ISO 3166-1 (ISO 3166-1 alpha-2) or ISO 3166-2 code, the place, or the GeoShape for the geo-political region(s) for which the offer or delivery charge specification is not valid, e.g. a region where the transaction is not allowed.
     *
     * See also {@link https://schema.org/eligibleRegion eligibleRegion}.
     */
    "ineligibleRegion"?: SchemaValue<GeoShape | Place | Text | IdReference, "ineligibleRegion">;
    /** Used to indicate a specific claim contained, implied, translated or refined from the content of a {@link https://schema.org/MediaObject MediaObject} or other {@link https://schema.org/CreativeWork CreativeWork}. The interpreting party can be indicated using {@link https://schema.org/claimInterpreter claimInterpreter}. */
    "interpretedAsClaim"?: SchemaValue<Claim | IdReference, "interpretedAsClaim">;
    /** Player type required—for example, Flash or Silverlight. */
    "playerType"?: SchemaValue<Text, "playerType">;
    /** The production company or studio responsible for the item, e.g. series, video game, episode etc. */
    "productionCompany"?: SchemaValue<Organization | IdReference, "productionCompany">;
    /** The regions where the media is allowed. If not specified, then it's assumed to be allowed everywhere. Specify the countries in {@link http://en.wikipedia.org/wiki/ISO_3166 ISO 3166 format}. */
    "regionsAllowed"?: SchemaValue<Place | IdReference, "regionsAllowed">;
    /** Indicates if use of the media require a subscription (either paid or free). Allowed values are `true` or `false` (note that an earlier version had 'yes', 'no'). */
    "requiresSubscription"?: SchemaValue<Boolean | MediaSubscription | IdReference, "requiresSubscription">;
    /** The {@link https://en.wikipedia.org/wiki/SHA-2 SHA-2} SHA256 hash of the content of the item. For example, a zero-length input has value 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'. */
    "sha256"?: SchemaValue<Text, "sha256">;
    /**
     * The startTime of something. For a reserved event or service (e.g. FoodEstablishmentReservation), the time that it is expected to start. For actions that span a period of time, when the action was performed. E.g. John wrote a book from _January_ to December. For media, including audio and video, it's the time offset of the start of a clip within a larger file.
     *
     * Note that Event uses startDate/endDate instead of startTime/endTime, even when describing dates with times. This situation may be clarified in future revisions.
     */
    "startTime"?: SchemaValue<DateTime | Time, "startTime">;
    /** Date (including time if available) when this media object was uploaded to this site. */
    "uploadDate"?: SchemaValue<Date | DateTime, "uploadDate">;
    /** The width of the item. */
    "width"?: SchemaValue<Distance | QuantitativeValue | IdReference, "width">;
}
interface MediaObjectLeaf extends MediaObjectBase {
    "@type": "MediaObject";
}
/** A media object, such as an image, video, audio, or text object embedded in a web page or a downloadable dataset i.e. DataDownload. Note that a creative work may have many media objects associated with it on the same web page. For example, a page about a single song (MusicRecording) may have a music video (VideoObject), and a high and low bandwidth audio stream (2 AudioObject's). */
export type MediaObject = MediaObjectLeaf | _3DModel | AmpStory | AudioObject | DataDownload | ImageObject | LegislationObject | MusicVideoObject | TextObject | VideoObject;
interface MediaReviewBase extends ReviewBase {
    /** Indicates a MediaManipulationRatingEnumeration classification of a media object (in the context of how it was published or shared). */
    "mediaAuthenticityCategory"?: SchemaValue<MediaManipulationRatingEnumeration | IdReference, "mediaAuthenticityCategory">;
    /** Describes, in a {@link https://schema.org/MediaReview MediaReview} when dealing with {@link https://schema.org/DecontextualizedContent DecontextualizedContent}, background information that can contribute to better interpretation of the {@link https://schema.org/MediaObject MediaObject}. */
    "originalMediaContextDescription"?: SchemaValue<Text, "originalMediaContextDescription">;
    /** Link to the page containing an original version of the content, or directly to an online copy of the original {@link https://schema.org/MediaObject MediaObject} content, e.g. video file. */
    "originalMediaLink"?: SchemaValue<MediaObject | URL | WebPage | IdReference, "originalMediaLink">;
}
interface MediaReviewLeaf extends MediaReviewBase {
    "@type": "MediaReview";
}
/** A {@link https://schema.org/MediaReview MediaReview} is a more specialized form of Review dedicated to the evaluation of media content online, typically in the context of fact-checking and misinformation. For more general reviews of media in the broader sense, use {@link https://schema.org/UserReview UserReview}, {@link https://schema.org/CriticReview CriticReview} or other {@link https://schema.org/Review Review} types. This definition is a work in progress. While the {@link https://schema.org/MediaManipulationRatingEnumeration MediaManipulationRatingEnumeration} list reflects significant community review amongst fact-checkers and others working to combat misinformation, the specific structures for representing media objects, their versions and publication context, are still evolving. Similarly, best practices for the relationship between {@link https://schema.org/MediaReview MediaReview} and {@link https://schema.org/ClaimReview ClaimReview} markup have not yet been finalized. */
export type MediaReview = MediaReviewLeaf;
interface MediaReviewItemBase extends CreativeWorkBase {
    /** In the context of a {@link https://schema.org/MediaReview MediaReview}, indicates specific media item(s) that are grouped using a {@link https://schema.org/MediaReviewItem MediaReviewItem}. */
    "mediaItemAppearance"?: SchemaValue<MediaObject | IdReference, "mediaItemAppearance">;
}
interface MediaReviewItemLeaf extends MediaReviewItemBase {
    "@type": "MediaReviewItem";
}
/** Represents an item or group of closely related items treated as a unit for the sake of evaluation in a {@link https://schema.org/MediaReview MediaReview}. Authorship etc. apply to the items rather than to the curation/grouping or reviewing party. */
export type MediaReviewItem = MediaReviewItemLeaf;
interface MediaSubscriptionBase extends ThingBase {
    /** The Organization responsible for authenticating the user's subscription. For example, many media apps require a cable/satellite provider to authenticate your subscription before playing media. */
    "authenticator"?: SchemaValue<Organization | IdReference, "authenticator">;
    /** An Offer which must be accepted before the user can perform the Action. For example, the user may need to buy a movie before being able to watch it. */
    "expectsAcceptanceOf"?: SchemaValue<Offer | IdReference, "expectsAcceptanceOf">;
}
interface MediaSubscriptionLeaf extends MediaSubscriptionBase {
    "@type": "MediaSubscription";
}
/** A subscription which allows a user to access media including audio, video, books, etc. */
export type MediaSubscription = MediaSubscriptionLeaf;
interface MedicalAudienceBase extends AudienceBase, PeopleAudienceBase {
}
interface MedicalAudienceLeaf extends MedicalAudienceBase {
    "@type": "MedicalAudience";
}
/** Target audiences for medical web pages. */
export type MedicalAudience = MedicalAudienceLeaf | Patient;
interface MedicalAudienceTypeLeaf extends EnumerationBase {
    "@type": "MedicalAudienceType";
}
/** Target audiences types for medical web pages. Enumerated type. */
export type MedicalAudienceType = "https://schema.org/Clinician" | "Clinician" | "https://schema.org/MedicalResearcher" | "MedicalResearcher" | MedicalAudienceTypeLeaf;
interface MedicalBusinessLeaf extends LocalBusinessBase {
    "@type": "MedicalBusiness";
}
/** A particular physical or virtual business of an organization for medical purposes. Examples of MedicalBusiness include different businesses run by health professionals. */
export type MedicalBusiness = MedicalBusinessLeaf | CommunityHealth | Dentist | Dermatology | DietNutrition | Emergency | Geriatric | Gynecologic | MedicalClinic | Midwifery | Nursing | Obstetric | Oncologic | Optician | Optometric | Otolaryngologic | Pediatric | Pharmacy | Physician | Physiotherapy | PlasticSurgery | Podiatric | PrimaryCare | Psychiatric | PublicHealth | string;
interface MedicalCauseBase extends MedicalEntityBase {
    /** The condition, complication, symptom, sign, etc. caused. */
    "causeOf"?: SchemaValue<MedicalEntity | IdReference, "causeOf">;
}
interface MedicalCauseLeaf extends MedicalCauseBase {
    "@type": "MedicalCause";
}
/** The causative agent(s) that are responsible for the pathophysiologic process that eventually results in a medical condition, symptom or sign. In this schema, unless otherwise specified this is meant to be the proximate cause of the medical condition, symptom or sign. The proximate cause is defined as the causative agent that most directly results in the medical condition, symptom or sign. For example, the HIV virus could be considered a cause of AIDS. Or in a diagnostic context, if a patient fell and sustained a hip fracture and two days later sustained a pulmonary embolism which eventuated in a cardiac arrest, the cause of the cardiac arrest (the proximate cause) would be the pulmonary embolism and not the fall. Medical causes can include cardiovascular, chemical, dermatologic, endocrine, environmental, gastroenterologic, genetic, hematologic, gynecologic, iatrogenic, infectious, musculoskeletal, neurologic, nutritional, obstetric, oncologic, otolaryngologic, pharmacologic, psychiatric, pulmonary, renal, rheumatologic, toxic, traumatic, or urologic causes; medical conditions can be causes as well. */
export type MedicalCause = MedicalCauseLeaf;
interface MedicalClinicBase extends LocalBusinessBase, MedicalOrganizationBase {
    /** A medical service available from this provider. */
    "availableService"?: SchemaValue<MedicalProcedure | MedicalTest | MedicalTherapy | IdReference, "availableService">;
    /** A medical specialty of the provider. */
    "medicalSpecialty"?: SchemaValue<MedicalSpecialty | IdReference, "medicalSpecialty">;
}
interface MedicalClinicLeaf extends MedicalClinicBase {
    "@type": "MedicalClinic";
}
/** A facility, often associated with a hospital or medical school, that is devoted to the specific diagnosis and/or healthcare. Previously limited to outpatients but with evolution it may be open to inpatients as well. */
export type MedicalClinic = MedicalClinicLeaf | CovidTestingFacility | string;
interface MedicalCodeBase extends MedicalEntityBase, CategoryCodeBase {
    /** A short textual code that uniquely identifies the value. */
    "codeValue"?: SchemaValue<Text, "codeValue">;
    /** The coding system, e.g. 'ICD-10'. */
    "codingSystem"?: SchemaValue<Text, "codingSystem">;
}
interface MedicalCodeLeaf extends MedicalCodeBase {
    "@type": "MedicalCode";
}
/** A code for a medical entity. */
export type MedicalCode = MedicalCodeLeaf;
interface MedicalConditionBase extends MedicalEntityBase {
    /** The anatomy of the underlying organ system or structures associated with this entity. */
    "associatedAnatomy"?: SchemaValue<AnatomicalStructure | AnatomicalSystem | SuperficialAnatomy | IdReference, "associatedAnatomy">;
    /** One of a set of differential diagnoses for the condition. Specifically, a closely-related or competing diagnosis typically considered later in the cognitive process whereby this medical condition is distinguished from others most likely responsible for a similar collection of signs and symptoms to reach the most parsimonious diagnosis or diagnoses in a patient. */
    "differentialDiagnosis"?: SchemaValue<DDxElement | IdReference, "differentialDiagnosis">;
    /** Specifying a drug or medicine used in a medication procedure. */
    "drug"?: SchemaValue<Drug | IdReference, "drug">;
    /** The characteristics of associated patients, such as age, gender, race etc. */
    "epidemiology"?: SchemaValue<Text, "epidemiology">;
    /** The likely outcome in either the short term or long term of the medical condition. */
    "expectedPrognosis"?: SchemaValue<Text, "expectedPrognosis">;
    /** The expected progression of the condition if it is not treated and allowed to progress naturally. */
    "naturalProgression"?: SchemaValue<Text, "naturalProgression">;
    /** Changes in the normal mechanical, physical, and biochemical functions that are associated with this activity or condition. */
    "pathophysiology"?: SchemaValue<Text, "pathophysiology">;
    /** A possible unexpected and unfavorable evolution of a medical condition. Complications may include worsening of the signs or symptoms of the disease, extension of the condition to other organ systems, etc. */
    "possibleComplication"?: SchemaValue<Text, "possibleComplication">;
    /** A possible treatment to address this condition, sign or symptom. */
    "possibleTreatment"?: SchemaValue<MedicalTherapy | IdReference, "possibleTreatment">;
    /** A preventative therapy used to prevent an initial occurrence of the medical condition, such as vaccination. */
    "primaryPrevention"?: SchemaValue<MedicalTherapy | IdReference, "primaryPrevention">;
    /** A modifiable or non-modifiable factor that increases the risk of a patient contracting this condition, e.g. age, coexisting condition. */
    "riskFactor"?: SchemaValue<MedicalRiskFactor | IdReference, "riskFactor">;
    /** A preventative therapy used to prevent reoccurrence of the medical condition after an initial episode of the condition. */
    "secondaryPrevention"?: SchemaValue<MedicalTherapy | IdReference, "secondaryPrevention">;
    /** A sign or symptom of this condition. Signs are objective or physically observable manifestations of the medical condition while symptoms are the subjective experience of the medical condition. */
    "signOrSymptom"?: SchemaValue<MedicalSignOrSymptom | IdReference, "signOrSymptom">;
    /** The stage of the condition, if applicable. */
    "stage"?: SchemaValue<MedicalConditionStage | IdReference, "stage">;
    /** The status of the study (enumerated). */
    "status"?: SchemaValue<EventStatusType | MedicalStudyStatus | Text | IdReference, "status">;
    /** A medical test typically performed given this condition. */
    "typicalTest"?: SchemaValue<MedicalTest | IdReference, "typicalTest">;
}
interface MedicalConditionLeaf extends MedicalConditionBase {
    "@type": "MedicalCondition";
}
/** Any condition of the human body that affects the normal functioning of a person, whether physically or mentally. Includes diseases, injuries, disabilities, disorders, syndromes, etc. */
export type MedicalCondition = MedicalConditionLeaf | InfectiousDisease | MedicalSignOrSymptom;
interface MedicalConditionStageBase extends MedicalEntityBase {
    /** The stage represented as a number, e.g. 3. */
    "stageAsNumber"?: SchemaValue<Number, "stageAsNumber">;
    /** The substage, e.g. 'a' for Stage IIIa. */
    "subStageSuffix"?: SchemaValue<Text, "subStageSuffix">;
}
interface MedicalConditionStageLeaf extends MedicalConditionStageBase {
    "@type": "MedicalConditionStage";
}
/** A stage of a medical condition, such as 'Stage IIIa'. */
export type MedicalConditionStage = MedicalConditionStageLeaf;
interface MedicalContraindicationLeaf extends MedicalEntityBase {
    "@type": "MedicalContraindication";
}
/** A condition or factor that serves as a reason to withhold a certain medical therapy. Contraindications can be absolute (there are no reasonable circumstances for undertaking a course of action) or relative (the patient is at higher risk of complications, but these risks may be outweighed by other considerations or mitigated by other measures). */
export type MedicalContraindication = MedicalContraindicationLeaf;
interface MedicalDeviceBase extends MedicalEntityBase {
    /** A possible complication and/or side effect of this therapy. If it is known that an adverse outcome is serious (resulting in death, disability, or permanent damage; requiring hospitalization; or otherwise life-threatening or requiring immediate medical attention), tag it as a seriousAdverseOutcome instead. */
    "adverseOutcome"?: SchemaValue<MedicalEntity | IdReference, "adverseOutcome">;
    /** A contraindication for this therapy. */
    "contraindication"?: SchemaValue<MedicalContraindication | Text | IdReference, "contraindication">;
    /** A description of the postoperative procedures, care, and/or followups for this device. */
    "postOp"?: SchemaValue<Text, "postOp">;
    /** A description of the workup, testing, and other preparations required before implanting this device. */
    "preOp"?: SchemaValue<Text, "preOp">;
    /** A description of the procedure involved in setting up, using, and/or installing the device. */
    "procedure"?: SchemaValue<Text, "procedure">;
    /** A possible serious complication and/or serious side effect of this therapy. Serious adverse outcomes include those that are life-threatening; result in death, disability, or permanent damage; require hospitalization or prolong existing hospitalization; cause congenital anomalies or birth defects; or jeopardize the patient and may require medical or surgical intervention to prevent one of the outcomes in this definition. */
    "seriousAdverseOutcome"?: SchemaValue<MedicalEntity | IdReference, "seriousAdverseOutcome">;
}
interface MedicalDeviceLeaf extends MedicalDeviceBase {
    "@type": "MedicalDevice";
}
/** Any object used in a medical capacity, such as to diagnose or treat a patient. */
export type MedicalDevice = MedicalDeviceLeaf;
interface MedicalDevicePurposeLeaf extends EnumerationBase {
    "@type": "MedicalDevicePurpose";
}
/** Categories of medical devices, organized by the purpose or intended use of the device. */
export type MedicalDevicePurpose = "https://schema.org/Diagnostic" | "Diagnostic" | "https://schema.org/Therapeutic" | "Therapeutic" | MedicalDevicePurposeLeaf;
interface MedicalEntityBase extends ThingBase {
    /** A medical code for the entity, taken from a controlled vocabulary or ontology such as ICD-9, DiseasesDB, MeSH, SNOMED-CT, RxNorm, etc. */
    "code"?: SchemaValue<MedicalCode | IdReference, "code">;
    /** A {@link https://schema.org/Grant Grant} that directly or indirectly provide funding or sponsorship for this item. See also {@link https://schema.org/ownershipFundingInfo ownershipFundingInfo}. */
    "funding"?: SchemaValue<Grant | IdReference, "funding">;
    /** A medical guideline related to this entity. */
    "guideline"?: SchemaValue<MedicalGuideline | IdReference, "guideline">;
    /** The drug or supplement's legal status, including any controlled substance schedules that apply. */
    "legalStatus"?: SchemaValue<DrugLegalStatus | MedicalEnumeration | Text | IdReference, "legalStatus">;
    /** The system of medicine that includes this MedicalEntity, for example 'evidence-based', 'homeopathic', 'chiropractic', etc. */
    "medicineSystem"?: SchemaValue<MedicineSystem | IdReference, "medicineSystem">;
    /** If applicable, the organization that officially recognizes this entity as part of its endorsed system of medicine. */
    "recognizingAuthority"?: SchemaValue<Organization | IdReference, "recognizingAuthority">;
    /** If applicable, a medical specialty in which this entity is relevant. */
    "relevantSpecialty"?: SchemaValue<MedicalSpecialty | IdReference, "relevantSpecialty">;
    /** A medical study or trial related to this entity. */
    "study"?: SchemaValue<MedicalStudy | IdReference, "study">;
}
interface MedicalEntityLeaf extends MedicalEntityBase {
    "@type": "MedicalEntity";
}
/** The most generic type of entity related to health and the practice of medicine. */
export type MedicalEntity = MedicalEntityLeaf | AnatomicalStructure | AnatomicalSystem | DrugClass | DrugCost | LifestyleModification | MedicalCause | MedicalCondition | MedicalContraindication | MedicalDevice | MedicalGuideline | MedicalIndication | MedicalIntangible | MedicalProcedure | MedicalRiskEstimator | MedicalRiskFactor | MedicalStudy | MedicalTest | Substance | SuperficialAnatomy;
interface MedicalEnumerationLeaf extends EnumerationBase {
    "@type": "MedicalEnumeration";
}
/** Enumerations related to health and the practice of medicine: A concept that is used to attribute a quality to another concept, as a qualifier, a collection of items or a listing of all of the elements of a set in medicine practice. */
export type MedicalEnumeration = MedicalEnumerationLeaf | DrugCostCategory | DrugPregnancyCategory | DrugPrescriptionStatus | InfectiousAgentClass | MedicalAudienceType | MedicalDevicePurpose | MedicalEvidenceLevel | MedicalImagingTechnique | MedicalObservationalStudyDesign | MedicalProcedureType | MedicalSpecialty | MedicalStudyStatus | MedicalTrialDesign | MedicineSystem | PhysicalExam;
interface MedicalEvidenceLevelLeaf extends EnumerationBase {
    "@type": "MedicalEvidenceLevel";
}
/** Level of evidence for a medical guideline. Enumerated type. */
export type MedicalEvidenceLevel = "https://schema.org/EvidenceLevelA" | "EvidenceLevelA" | "https://schema.org/EvidenceLevelB" | "EvidenceLevelB" | "https://schema.org/EvidenceLevelC" | "EvidenceLevelC" | MedicalEvidenceLevelLeaf;
interface MedicalGuidelineBase extends MedicalEntityBase {
    /** Strength of evidence of the data used to formulate the guideline (enumerated). */
    "evidenceLevel"?: SchemaValue<MedicalEvidenceLevel | IdReference, "evidenceLevel">;
    /** Source of the data used to formulate the guidance, e.g. RCT, consensus opinion, etc. */
    "evidenceOrigin"?: SchemaValue<Text, "evidenceOrigin">;
    /** Date on which this guideline's recommendation was made. */
    "guidelineDate"?: SchemaValue<Date, "guidelineDate">;
    /** The medical conditions, treatments, etc. that are the subject of the guideline. */
    "guidelineSubject"?: SchemaValue<MedicalEntity | IdReference, "guidelineSubject">;
}
interface MedicalGuidelineLeaf extends MedicalGuidelineBase {
    "@type": "MedicalGuideline";
}
/** Any recommendation made by a standard society (e.g. ACC/AHA) or consensus statement that denotes how to diagnose and treat a particular condition. Note: this type should be used to tag the actual guideline recommendation; if the guideline recommendation occurs in a larger scholarly article, use MedicalScholarlyArticle to tag the overall article, not this type. Note also: the organization making the recommendation should be captured in the recognizingAuthority base property of MedicalEntity. */
export type MedicalGuideline = MedicalGuidelineLeaf | MedicalGuidelineContraindication | MedicalGuidelineRecommendation;
interface MedicalGuidelineContraindicationLeaf extends MedicalGuidelineBase {
    "@type": "MedicalGuidelineContraindication";
}
/** A guideline contraindication that designates a process as harmful and where quality of the data supporting the contraindication is sound. */
export type MedicalGuidelineContraindication = MedicalGuidelineContraindicationLeaf;
interface MedicalGuidelineRecommendationBase extends MedicalGuidelineBase {
    /** Strength of the guideline's recommendation (e.g. 'class I'). */
    "recommendationStrength"?: SchemaValue<Text, "recommendationStrength">;
}
interface MedicalGuidelineRecommendationLeaf extends MedicalGuidelineRecommendationBase {
    "@type": "MedicalGuidelineRecommendation";
}
/** A guideline recommendation that is regarded as efficacious and where quality of the data supporting the recommendation is sound. */
export type MedicalGuidelineRecommendation = MedicalGuidelineRecommendationLeaf;
interface MedicalImagingTechniqueLeaf extends EnumerationBase {
    "@type": "MedicalImagingTechnique";
}
/** Any medical imaging modality typically used for diagnostic purposes. Enumerated type. */
export type MedicalImagingTechnique = "https://schema.org/CT" | "CT" | "https://schema.org/MRI" | "MRI" | "https://schema.org/PET" | "PET" | "https://schema.org/Radiography" | "Radiography" | "https://schema.org/Ultrasound" | "Ultrasound" | "https://schema.org/XRay" | "XRay" | MedicalImagingTechniqueLeaf;
interface MedicalIndicationLeaf extends MedicalEntityBase {
    "@type": "MedicalIndication";
}
/** A condition or factor that indicates use of a medical therapy, including signs, symptoms, risk factors, anatomical states, etc. */
export type MedicalIndication = MedicalIndicationLeaf | ApprovedIndication | PreventionIndication | TreatmentIndication;
interface MedicalIntangibleLeaf extends MedicalEntityBase {
    "@type": "MedicalIntangible";
}
/** A utility class that serves as the umbrella for a number of 'intangible' things in the medical space. */
export type MedicalIntangible = MedicalIntangibleLeaf | DDxElement | DoseSchedule | DrugLegalStatus | DrugStrength | MedicalCode | MedicalConditionStage;
interface MedicalObservationalStudyBase extends MedicalStudyBase {
    /** Specifics about the observational study design (enumerated). */
    "studyDesign"?: SchemaValue<MedicalObservationalStudyDesign | IdReference, "studyDesign">;
}
interface MedicalObservationalStudyLeaf extends MedicalObservationalStudyBase {
    "@type": "MedicalObservationalStudy";
}
/** An observational study is a type of medical study that attempts to infer the possible effect of a treatment through observation of a cohort of subjects over a period of time. In an observational study, the assignment of subjects into treatment groups versus control groups is outside the control of the investigator. This is in contrast with controlled studies, such as the randomized controlled trials represented by MedicalTrial, where each subject is randomly assigned to a treatment group or a control group before the start of the treatment. */
export type MedicalObservationalStudy = MedicalObservationalStudyLeaf;
interface MedicalObservationalStudyDesignLeaf extends EnumerationBase {
    "@type": "MedicalObservationalStudyDesign";
}
/** Design models for observational medical studies. Enumerated type. */
export type MedicalObservationalStudyDesign = "https://schema.org/CaseSeries" | "CaseSeries" | "https://schema.org/CohortStudy" | "CohortStudy" | "https://schema.org/CrossSectional" | "CrossSectional" | "https://schema.org/Longitudinal" | "Longitudinal" | "https://schema.org/Observational" | "Observational" | "https://schema.org/Registry" | "Registry" | MedicalObservationalStudyDesignLeaf;
interface MedicalOrganizationBase extends OrganizationBase {
    /** Name or unique ID of network. (Networks are often reused across different insurance plans.) */
    "healthPlanNetworkId"?: SchemaValue<Text, "healthPlanNetworkId">;
    /** Whether the provider is accepting new patients. */
    "isAcceptingNewPatients"?: SchemaValue<Boolean, "isAcceptingNewPatients">;
    /** A medical specialty of the provider. */
    "medicalSpecialty"?: SchemaValue<MedicalSpecialty | IdReference, "medicalSpecialty">;
}
interface MedicalOrganizationLeaf extends MedicalOrganizationBase {
    "@type": "MedicalOrganization";
}
/** A medical organization (physical or not), such as hospital, institution or clinic. */
export type MedicalOrganization = MedicalOrganizationLeaf | Dentist | DiagnosticLab | Hospital | MedicalClinic | Pharmacy | Physician | VeterinaryCare | string;
interface MedicalProcedureBase extends MedicalEntityBase {
    /** Location in the body of the anatomical structure. */
    "bodyLocation"?: SchemaValue<Text, "bodyLocation">;
    /** Typical or recommended followup care after the procedure is performed. */
    "followup"?: SchemaValue<Text, "followup">;
    /** How the procedure is performed. */
    "howPerformed"?: SchemaValue<Text, "howPerformed">;
    /** Typical preparation that a patient must undergo before having the procedure performed. */
    "preparation"?: SchemaValue<MedicalEntity | Text | IdReference, "preparation">;
    /** The type of procedure, for example Surgical, Noninvasive, or Percutaneous. */
    "procedureType"?: SchemaValue<MedicalProcedureType | IdReference, "procedureType">;
    /** The status of the study (enumerated). */
    "status"?: SchemaValue<EventStatusType | MedicalStudyStatus | Text | IdReference, "status">;
}
interface MedicalProcedureLeaf extends MedicalProcedureBase {
    "@type": "MedicalProcedure";
}
/** A process of care used in either a diagnostic, therapeutic, preventive or palliative capacity that relies on invasive (surgical), non-invasive, or other techniques. */
export type MedicalProcedure = MedicalProcedureLeaf | DiagnosticProcedure | PalliativeProcedure | PhysicalExam | SurgicalProcedure | TherapeuticProcedure;
interface MedicalProcedureTypeLeaf extends EnumerationBase {
    "@type": "MedicalProcedureType";
}
/** An enumeration that describes different types of medical procedures. */
export type MedicalProcedureType = "https://schema.org/NoninvasiveProcedure" | "NoninvasiveProcedure" | "https://schema.org/PercutaneousProcedure" | "PercutaneousProcedure" | MedicalProcedureTypeLeaf;
interface MedicalRiskCalculatorLeaf extends MedicalRiskEstimatorBase {
    "@type": "MedicalRiskCalculator";
}
/** A complex mathematical calculation requiring an online calculator, used to assess prognosis. Note: use the url property of Thing to record any URLs for online calculators. */
export type MedicalRiskCalculator = MedicalRiskCalculatorLeaf;
interface MedicalRiskEstimatorBase extends MedicalEntityBase {
    /** The condition, complication, or symptom whose risk is being estimated. */
    "estimatesRiskOf"?: SchemaValue<MedicalEntity | IdReference, "estimatesRiskOf">;
    /** A modifiable or non-modifiable risk factor included in the calculation, e.g. age, coexisting condition. */
    "includedRiskFactor"?: SchemaValue<MedicalRiskFactor | IdReference, "includedRiskFactor">;
}
interface MedicalRiskEstimatorLeaf extends MedicalRiskEstimatorBase {
    "@type": "MedicalRiskEstimator";
}
/** Any rule set or interactive tool for estimating the risk of developing a complication or condition. */
export type MedicalRiskEstimator = MedicalRiskEstimatorLeaf | MedicalRiskCalculator | MedicalRiskScore;
interface MedicalRiskFactorBase extends MedicalEntityBase {
    /** The condition, complication, etc. influenced by this factor. */
    "increasesRiskOf"?: SchemaValue<MedicalEntity | IdReference, "increasesRiskOf">;
}
interface MedicalRiskFactorLeaf extends MedicalRiskFactorBase {
    "@type": "MedicalRiskFactor";
}
/** A risk factor is anything that increases a person's likelihood of developing or contracting a disease, medical condition, or complication. */
export type MedicalRiskFactor = MedicalRiskFactorLeaf;
interface MedicalRiskScoreBase extends MedicalRiskEstimatorBase {
    /** The algorithm or rules to follow to compute the score. */
    "algorithm"?: SchemaValue<Text, "algorithm">;
}
interface MedicalRiskScoreLeaf extends MedicalRiskScoreBase {
    "@type": "MedicalRiskScore";
}
/** A simple system that adds up the number of risk factors to yield a score that is associated with prognosis, e.g. CHAD score, TIMI risk score. */
export type MedicalRiskScore = MedicalRiskScoreLeaf;
interface MedicalScholarlyArticleBase extends ArticleBase {
    /** The type of the medical article, taken from the US NLM MeSH publication type catalog. See also {@link http://www.nlm.nih.gov/mesh/pubtypes.html MeSH documentation}. */
    "publicationType"?: SchemaValue<Text, "publicationType">;
}
interface MedicalScholarlyArticleLeaf extends MedicalScholarlyArticleBase {
    "@type": "MedicalScholarlyArticle";
}
/** A scholarly article in the medical domain. */
export type MedicalScholarlyArticle = MedicalScholarlyArticleLeaf;
interface MedicalSignBase extends MedicalSignOrSymptomBase {
    /** A physical examination that can identify this sign. */
    "identifyingExam"?: SchemaValue<PhysicalExam | IdReference, "identifyingExam">;
    /** A diagnostic test that can identify this sign. */
    "identifyingTest"?: SchemaValue<MedicalTest | IdReference, "identifyingTest">;
}
interface MedicalSignLeaf extends MedicalSignBase {
    "@type": "MedicalSign";
}
/** Any physical manifestation of a person's medical condition discoverable by objective diagnostic tests or physical examination. */
export type MedicalSign = MedicalSignLeaf | VitalSign;
interface MedicalSignOrSymptomBase extends MedicalConditionBase {
    /** A possible treatment to address this condition, sign or symptom. */
    "possibleTreatment"?: SchemaValue<MedicalTherapy | IdReference, "possibleTreatment">;
}
interface MedicalSignOrSymptomLeaf extends MedicalSignOrSymptomBase {
    "@type": "MedicalSignOrSymptom";
}
/** Any feature associated or not with a medical condition. In medicine a symptom is generally subjective while a sign is objective. */
export type MedicalSignOrSymptom = MedicalSignOrSymptomLeaf | MedicalSign | MedicalSymptom;
interface MedicalSpecialtyBase extends EnumerationBase, EnumerationBase {
}
interface MedicalSpecialtyLeaf extends MedicalSpecialtyBase {
    "@type": "MedicalSpecialty";
}
/** Any specific branch of medical science or practice. Medical specialities include clinical specialties that pertain to particular organ systems and their respective disease states, as well as allied health specialties. Enumerated type. */
export type MedicalSpecialty = "https://schema.org/Anesthesia" | "Anesthesia" | "https://schema.org/Cardiovascular" | "Cardiovascular" | "https://schema.org/CommunityHealth" | "CommunityHealth" | "https://schema.org/Dentistry" | "Dentistry" | "https://schema.org/Dermatologic" | "Dermatologic" | "https://schema.org/Dermatology" | "Dermatology" | "https://schema.org/DietNutrition" | "DietNutrition" | "https://schema.org/Emergency" | "Emergency" | "https://schema.org/Endocrine" | "Endocrine" | "https://schema.org/Gastroenterologic" | "Gastroenterologic" | "https://schema.org/Genetic" | "Genetic" | "https://schema.org/Geriatric" | "Geriatric" | "https://schema.org/Gynecologic" | "Gynecologic" | "https://schema.org/Hematologic" | "Hematologic" | "https://schema.org/Infectious" | "Infectious" | "https://schema.org/LaboratoryScience" | "LaboratoryScience" | "https://schema.org/Midwifery" | "Midwifery" | "https://schema.org/Musculoskeletal" | "Musculoskeletal" | "https://schema.org/Neurologic" | "Neurologic" | "https://schema.org/Nursing" | "Nursing" | "https://schema.org/Obstetric" | "Obstetric" | "https://schema.org/Oncologic" | "Oncologic" | "https://schema.org/Optometric" | "Optometric" | "https://schema.org/Otolaryngologic" | "Otolaryngologic" | "https://schema.org/Pathology" | "Pathology" | "https://schema.org/Pediatric" | "Pediatric" | "https://schema.org/PharmacySpecialty" | "PharmacySpecialty" | "https://schema.org/Physiotherapy" | "Physiotherapy" | "https://schema.org/PlasticSurgery" | "PlasticSurgery" | "https://schema.org/Podiatric" | "Podiatric" | "https://schema.org/PrimaryCare" | "PrimaryCare" | "https://schema.org/Psychiatric" | "Psychiatric" | "https://schema.org/PublicHealth" | "PublicHealth" | "https://schema.org/Pulmonary" | "Pulmonary" | "https://schema.org/Radiography" | "Radiography" | "https://schema.org/Renal" | "Renal" | "https://schema.org/RespiratoryTherapy" | "RespiratoryTherapy" | "https://schema.org/Rheumatologic" | "Rheumatologic" | "https://schema.org/SpeechPathology" | "SpeechPathology" | "https://schema.org/Surgical" | "Surgical" | "https://schema.org/Toxicologic" | "Toxicologic" | "https://schema.org/Urologic" | "Urologic" | MedicalSpecialtyLeaf;
interface MedicalStudyBase extends MedicalEntityBase {
    /** Specifying the health condition(s) of a patient, medical study, or other target audience. */
    "healthCondition"?: SchemaValue<MedicalCondition | IdReference, "healthCondition">;
    /** A person or organization that supports a thing through a pledge, promise, or financial contribution. E.g. a sponsor of a Medical Study or a corporate sponsor of an event. */
    "sponsor"?: SchemaValue<Organization | Person | IdReference, "sponsor">;
    /** The status of the study (enumerated). */
    "status"?: SchemaValue<EventStatusType | MedicalStudyStatus | Text | IdReference, "status">;
    /** The location in which the study is taking/took place. */
    "studyLocation"?: SchemaValue<AdministrativeArea | IdReference, "studyLocation">;
    /** A subject of the study, i.e. one of the medical conditions, therapies, devices, drugs, etc. investigated by the study. */
    "studySubject"?: SchemaValue<MedicalEntity | IdReference, "studySubject">;
}
interface MedicalStudyLeaf extends MedicalStudyBase {
    "@type": "MedicalStudy";
}
/** A medical study is an umbrella type covering all kinds of research studies relating to human medicine or health, including observational studies and interventional trials and registries, randomized, controlled or not. When the specific type of study is known, use one of the extensions of this type, such as MedicalTrial or MedicalObservationalStudy. Also, note that this type should be used to mark up data that describes the study itself; to tag an article that publishes the results of a study, use MedicalScholarlyArticle. Note: use the code property of MedicalEntity to store study IDs, e.g. clinicaltrials.gov ID. */
export type MedicalStudy = MedicalStudyLeaf | MedicalObservationalStudy | MedicalTrial;
interface MedicalStudyStatusLeaf extends EnumerationBase {
    "@type": "MedicalStudyStatus";
}
/** The status of a medical study. Enumerated type. */
export type MedicalStudyStatus = "https://schema.org/ActiveNotRecruiting" | "ActiveNotRecruiting" | "https://schema.org/Completed" | "Completed" | "https://schema.org/EnrollingByInvitation" | "EnrollingByInvitation" | "https://schema.org/NotYetRecruiting" | "NotYetRecruiting" | "https://schema.org/Recruiting" | "Recruiting" | "https://schema.org/ResultsAvailable" | "ResultsAvailable" | "https://schema.org/ResultsNotAvailable" | "ResultsNotAvailable" | "https://schema.org/Suspended" | "Suspended" | "https://schema.org/Terminated" | "Terminated" | "https://schema.org/Withdrawn" | "Withdrawn" | MedicalStudyStatusLeaf;
interface MedicalSymptomLeaf extends MedicalSignOrSymptomBase {
    "@type": "MedicalSymptom";
}
/** Any complaint sensed and expressed by the patient (therefore defined as subjective) like stomachache, lower-back pain, or fatigue. */
export type MedicalSymptom = MedicalSymptomLeaf;
interface MedicalTestBase extends MedicalEntityBase {
    /** Drugs that affect the test's results. */
    "affectedBy"?: SchemaValue<Drug | IdReference, "affectedBy">;
    /** Range of acceptable values for a typical patient, when applicable. */
    "normalRange"?: SchemaValue<MedicalEnumeration | Text | IdReference, "normalRange">;
    /** A sign detected by the test. */
    "signDetected"?: SchemaValue<MedicalSign | IdReference, "signDetected">;
    /** A condition the test is used to diagnose. */
    "usedToDiagnose"?: SchemaValue<MedicalCondition | IdReference, "usedToDiagnose">;
    /** Device used to perform the test. */
    "usesDevice"?: SchemaValue<MedicalDevice | IdReference, "usesDevice">;
}
interface MedicalTestLeaf extends MedicalTestBase {
    "@type": "MedicalTest";
}
/** Any medical test, typically performed for diagnostic purposes. */
export type MedicalTest = MedicalTestLeaf | BloodTest | ImagingTest | MedicalTestPanel | PathologyTest;
interface MedicalTestPanelBase extends MedicalTestBase {
    /** A component test of the panel. */
    "subTest"?: SchemaValue<MedicalTest | IdReference, "subTest">;
}
interface MedicalTestPanelLeaf extends MedicalTestPanelBase {
    "@type": "MedicalTestPanel";
}
/** Any collection of tests commonly ordered together. */
export type MedicalTestPanel = MedicalTestPanelLeaf;
interface MedicalTherapyBase extends TherapeuticProcedureBase {
    /** A contraindication for this therapy. */
    "contraindication"?: SchemaValue<MedicalContraindication | Text | IdReference, "contraindication">;
    /** A therapy that duplicates or overlaps this one. */
    "duplicateTherapy"?: SchemaValue<MedicalTherapy | IdReference, "duplicateTherapy">;
    /** A possible serious complication and/or serious side effect of this therapy. Serious adverse outcomes include those that are life-threatening; result in death, disability, or permanent damage; require hospitalization or prolong existing hospitalization; cause congenital anomalies or birth defects; or jeopardize the patient and may require medical or surgical intervention to prevent one of the outcomes in this definition. */
    "seriousAdverseOutcome"?: SchemaValue<MedicalEntity | IdReference, "seriousAdverseOutcome">;
}
interface MedicalTherapyLeaf extends MedicalTherapyBase {
    "@type": "MedicalTherapy";
}
/** Any medical intervention designed to prevent, treat, and cure human diseases and medical conditions, including both curative and palliative therapies. Medical therapies are typically processes of care relying upon pharmacotherapy, behavioral therapy, supportive therapy (with fluid or nutrition for example), or detoxification (e.g. hemodialysis) aimed at improving or preventing a health condition. */
export type MedicalTherapy = MedicalTherapyLeaf | OccupationalTherapy | PalliativeProcedure | PhysicalTherapy | RadiationTherapy | RespiratoryTherapy;
interface MedicalTrialBase extends MedicalStudyBase {
    /** Specifics about the trial design (enumerated). */
    "trialDesign"?: SchemaValue<MedicalTrialDesign | IdReference, "trialDesign">;
}
interface MedicalTrialLeaf extends MedicalTrialBase {
    "@type": "MedicalTrial";
}
/** A medical trial is a type of medical study that uses a scientific process to compare the safety and efficacy of medical therapies or medical procedures. In general, medical trials are controlled and subjects are allocated at random to the different treatment and/or control groups. */
export type MedicalTrial = MedicalTrialLeaf;
interface MedicalTrialDesignLeaf extends EnumerationBase {
    "@type": "MedicalTrialDesign";
}
/** Design models for medical trials. Enumerated type. */
export type MedicalTrialDesign = "https://schema.org/DoubleBlindedTrial" | "DoubleBlindedTrial" | "https://schema.org/InternationalTrial" | "InternationalTrial" | "https://schema.org/MultiCenterTrial" | "MultiCenterTrial" | "https://schema.org/OpenTrial" | "OpenTrial" | "https://schema.org/PlaceboControlledTrial" | "PlaceboControlledTrial" | "https://schema.org/RandomizedTrial" | "RandomizedTrial" | "https://schema.org/SingleBlindedTrial" | "SingleBlindedTrial" | "https://schema.org/SingleCenterTrial" | "SingleCenterTrial" | "https://schema.org/TripleBlindedTrial" | "TripleBlindedTrial" | MedicalTrialDesignLeaf;
interface MedicalWebPageBase extends WebPageBase {
    /**
     * An aspect of medical practice that is considered on the page, such as 'diagnosis', 'treatment', 'causes', 'prognosis', 'etiology', 'epidemiology', etc.
     *
     * @deprecated Consider using https://schema.org/mainContentOfPage instead.
     */
    "aspect"?: SchemaValue<Text, "aspect">;
    /** Medical audience for page. */
    "medicalAudience"?: SchemaValue<MedicalAudience | MedicalAudienceType | IdReference, "medicalAudience">;
}
interface MedicalWebPageLeaf extends MedicalWebPageBase {
    "@type": "MedicalWebPage";
}
/** A web page that provides medical information. */
export type MedicalWebPage = MedicalWebPageLeaf;
interface MedicineSystemLeaf extends EnumerationBase {
    "@type": "MedicineSystem";
}
/** Systems of medical practice. */
export type MedicineSystem = "https://schema.org/Ayurvedic" | "Ayurvedic" | "https://schema.org/Chiropractic" | "Chiropractic" | "https://schema.org/Homeopathic" | "Homeopathic" | "https://schema.org/Osteopathic" | "Osteopathic" | "https://schema.org/TraditionalChinese" | "TraditionalChinese" | "https://schema.org/WesternConventional" | "WesternConventional" | MedicineSystemLeaf;
interface MeetingRoomLeaf extends AccommodationBase {
    "@type": "MeetingRoom";
}
/**
 * A meeting room, conference room, or conference hall is a room provided for singular events such as business conferences and meetings (source: Wikipedia, the free encyclopedia, see {@link http://en.wikipedia.org/wiki/Conference_hall http://en.wikipedia.org/wiki/Conference_hall}).
 *
 * See also the {@link /docs/hotels.html dedicated document on the use of schema.org for marking up hotels and other forms of accommodations}.
 */
export type MeetingRoom = MeetingRoomLeaf | string;
interface MemberProgramBase extends ThingBase {
    /** The tiers of a member program. */
    "hasTiers"?: SchemaValue<MemberProgramTier | IdReference, "hasTiers">;
    /** The Organization (airline, travelers' club, retailer, etc.) the membership is made with or which offers the MemberProgram. */
    "hostingOrganization"?: SchemaValue<Organization | IdReference, "hostingOrganization">;
}
interface MemberProgramLeaf extends MemberProgramBase {
    "@type": "MemberProgram";
}
/** A MemberProgram defines a loyalty (or membership) program that provides its members with certain benefits, for example better pricing, free shipping or returns, or the ability to earn loyalty points. Member programs may have multiple tiers, for example silver and gold members, each with different benefits. */
export type MemberProgram = MemberProgramLeaf;
interface MemberProgramTierBase extends ThingBase {
    /** A member benefit for a particular tier of a loyalty program. */
    "hasTierBenefit"?: SchemaValue<TierBenefitEnumeration | IdReference, "hasTierBenefit">;
    /** A requirement for a user to join a membership tier, for example: a CreditCard if the tier requires sign up for a credit card, A UnitPriceSpecification if the user is required to pay a (periodic) fee, or a MonetaryAmount if the user needs to spend a minimum amount to join the tier. If a tier is free to join then this property does not need to be specified. */
    "hasTierRequirement"?: SchemaValue<CreditCard | MonetaryAmount | Text | UnitPriceSpecification | IdReference, "hasTierRequirement">;
    /** The member program this tier is a part of. */
    "isTierOf"?: SchemaValue<MemberProgram | IdReference, "isTierOf">;
    /** The number of membership points earned by the member. If necessary, the unitText can be used to express the units the points are issued in. (E.g. stars, miles, etc.) */
    "membershipPointsEarned"?: SchemaValue<Number | QuantitativeValue | IdReference, "membershipPointsEarned">;
}
interface MemberProgramTierLeaf extends MemberProgramTierBase {
    "@type": "MemberProgramTier";
}
/** A MemberProgramTier specifies a tier under a loyalty (member) program, for example "gold". */
export type MemberProgramTier = MemberProgramTierLeaf;
interface MensClothingStoreLeaf extends LocalBusinessBase {
    "@type": "MensClothingStore";
}
/** A men's clothing store. */
export type MensClothingStore = MensClothingStoreLeaf | string;
interface MenuBase extends CreativeWorkBase {
    /** A food or drink item contained in a menu or menu section. */
    "hasMenuItem"?: SchemaValue<MenuItem | IdReference, "hasMenuItem">;
    /** A subgrouping of the menu (by dishes, course, serving time period, etc.). */
    "hasMenuSection"?: SchemaValue<MenuSection | IdReference, "hasMenuSection">;
}
interface MenuLeaf extends MenuBase {
    "@type": "Menu";
}
/** A structured representation of food or drink items available from a FoodEstablishment. */
export type Menu = MenuLeaf;
interface MenuItemBase extends ThingBase {
    /** Additional menu item(s) such as a side dish of salad or side order of fries that can be added to this menu item. Additionally it can be a menu section containing allowed add-on menu items for this menu item. */
    "menuAddOn"?: SchemaValue<MenuItem | MenuSection | IdReference, "menuAddOn">;
    /** Nutrition information about the recipe or menu item. */
    "nutrition"?: SchemaValue<NutritionInformation | IdReference, "nutrition">;
    /** An offer to provide this item—for example, an offer to sell a product, rent the DVD of a movie, perform a service, or give away tickets to an event. Use {@link https://schema.org/businessFunction businessFunction} to indicate the kind of transaction offered, i.e. sell, lease, etc. This property can also be used to describe a {@link https://schema.org/Demand Demand}. While this property is listed as expected on a number of common types, it can be used in others. In that case, using a second type, such as Product or a subtype of Product, can clarify the nature of the offer. */
    "offers"?: SchemaValue<Demand | Offer | IdReference, "offers">;
    /** Indicates a dietary restriction or guideline for which this recipe or menu item is suitable, e.g. diabetic, halal etc. */
    "suitableForDiet"?: SchemaValue<RestrictedDiet | IdReference, "suitableForDiet">;
}
interface MenuItemLeaf extends MenuItemBase {
    "@type": "MenuItem";
}
/** A food or drink item listed in a menu or menu section. */
export type MenuItem = MenuItemLeaf;
interface MenuSectionBase extends CreativeWorkBase {
    /** A food or drink item contained in a menu or menu section. */
    "hasMenuItem"?: SchemaValue<MenuItem | IdReference, "hasMenuItem">;
    /** A subgrouping of the menu (by dishes, course, serving time period, etc.). */
    "hasMenuSection"?: SchemaValue<MenuSection | IdReference, "hasMenuSection">;
}
interface MenuSectionLeaf extends MenuSectionBase {
    "@type": "MenuSection";
}
/** A sub-grouping of food or drink items in a menu. E.g. courses (such as 'Dinner', 'Breakfast', etc.), specific type of dishes (such as 'Meat', 'Vegan', 'Drinks', etc.), or some other classification made by the menu provider. */
export type MenuSection = MenuSectionLeaf;
interface MerchantReturnEnumerationLeaf extends EnumerationBase {
    "@type": "MerchantReturnEnumeration";
}
/** Enumerates several kinds of product return policies. */
export type MerchantReturnEnumeration = "https://schema.org/MerchantReturnFiniteReturnWindow" | "MerchantReturnFiniteReturnWindow" | "https://schema.org/MerchantReturnNotPermitted" | "MerchantReturnNotPermitted" | "https://schema.org/MerchantReturnUnlimitedWindow" | "MerchantReturnUnlimitedWindow" | "https://schema.org/MerchantReturnUnspecified" | "MerchantReturnUnspecified" | MerchantReturnEnumerationLeaf;
interface MerchantReturnPolicyBase extends ThingBase {
    /**
     * A property-value pair representing an additional characteristic of the entity, e.g. a product feature or another characteristic for which there is no matching property in schema.org.
     *
     * Note: Publishers should be aware that applications designed to use specific schema.org properties (e.g. https://schema.org/width, https://schema.org/color, https://schema.org/gtin13, ...) will typically expect such data to be provided using those properties, rather than using the generic property/value mechanism.
     */
    "additionalProperty"?: SchemaValue<PropertyValue | IdReference, "additionalProperty">;
    /** A country where a particular merchant return policy applies to, for example the two-letter ISO 3166-1 alpha-2 country code. */
    "applicableCountry"?: SchemaValue<Country | Text | IdReference, "applicableCountry">;
    /** The type of return fees if the product is returned due to customer remorse. */
    "customerRemorseReturnFees"?: SchemaValue<ReturnFeesEnumeration | IdReference, "customerRemorseReturnFees">;
    /** The method (from an enumeration) by which the customer obtains a return shipping label for a product returned due to customer remorse. */
    "customerRemorseReturnLabelSource"?: SchemaValue<ReturnLabelSourceEnumeration | IdReference, "customerRemorseReturnLabelSource">;
    /** The amount of shipping costs if a product is returned due to customer remorse. Applicable when property {@link https://schema.org/customerRemorseReturnFees customerRemorseReturnFees} equals {@link https://schema.org/ReturnShippingFees ReturnShippingFees}. */
    "customerRemorseReturnShippingFeesAmount"?: SchemaValue<MonetaryAmount | IdReference, "customerRemorseReturnShippingFeesAmount">;
    /** Are in-store returns offered? (For more advanced return methods use the {@link https://schema.org/returnMethod returnMethod} property.) */
    "inStoreReturnsOffered"?: SchemaValue<Boolean, "inStoreReturnsOffered">;
    /** A predefined value from OfferItemCondition specifying the condition of the product or service, or the products or services included in the offer. Also used for product return policies to specify the condition of products accepted for returns. */
    "itemCondition"?: SchemaValue<OfferItemCondition | IdReference, "itemCondition">;
    /** The type of return fees for returns of defect products. */
    "itemDefectReturnFees"?: SchemaValue<ReturnFeesEnumeration | IdReference, "itemDefectReturnFees">;
    /** The method (from an enumeration) by which the customer obtains a return shipping label for a defect product. */
    "itemDefectReturnLabelSource"?: SchemaValue<ReturnLabelSourceEnumeration | IdReference, "itemDefectReturnLabelSource">;
    /** Amount of shipping costs for defect product returns. Applicable when property {@link https://schema.org/itemDefectReturnFees itemDefectReturnFees} equals {@link https://schema.org/ReturnShippingFees ReturnShippingFees}. */
    "itemDefectReturnShippingFeesAmount"?: SchemaValue<MonetaryAmount | IdReference, "itemDefectReturnShippingFeesAmount">;
    /** Specifies either a fixed return date or the number of days (from the delivery date) that a product can be returned. Used when the {@link https://schema.org/returnPolicyCategory returnPolicyCategory} property is specified as {@link https://schema.org/MerchantReturnFiniteReturnWindow MerchantReturnFiniteReturnWindow}. */
    "merchantReturnDays"?: SchemaValue<Date | DateTime | Integer, "merchantReturnDays">;
    /** Specifies a Web page or service by URL, for product returns. */
    "merchantReturnLink"?: SchemaValue<URL, "merchantReturnLink">;
    /** A refund type, from an enumerated list. */
    "refundType"?: SchemaValue<RefundTypeEnumeration | IdReference, "refundType">;
    /** Use {@link https://schema.org/MonetaryAmount MonetaryAmount} to specify a fixed restocking fee for product returns, or use {@link https://schema.org/Number Number} to specify a percentage of the product price paid by the customer. */
    "restockingFee"?: SchemaValue<MonetaryAmount | Number | IdReference, "restockingFee">;
    /** The type of return fees for purchased products (for any return reason). */
    "returnFees"?: SchemaValue<ReturnFeesEnumeration | IdReference, "returnFees">;
    /** The method (from an enumeration) by which the customer obtains a return shipping label for a product returned for any reason. */
    "returnLabelSource"?: SchemaValue<ReturnLabelSourceEnumeration | IdReference, "returnLabelSource">;
    /** The type of return method offered, specified from an enumeration. */
    "returnMethod"?: SchemaValue<ReturnMethodEnumeration | IdReference, "returnMethod">;
    /** Specifies an applicable return policy (from an enumeration). */
    "returnPolicyCategory"?: SchemaValue<MerchantReturnEnumeration | IdReference, "returnPolicyCategory">;
    /** The country where the product has to be sent to for returns, for example "Ireland" using the {@link https://schema.org/name name} property of {@link https://schema.org/Country Country}. You can also provide the two-letter {@link http://en.wikipedia.org/wiki/ISO_3166-1 ISO 3166-1 alpha-2 country code}. Note that this can be different from the country where the product was originally shipped from or sent to. */
    "returnPolicyCountry"?: SchemaValue<Country | Text | IdReference, "returnPolicyCountry">;
    /** Seasonal override of a return policy. */
    "returnPolicySeasonalOverride"?: SchemaValue<MerchantReturnPolicySeasonalOverride | IdReference, "returnPolicySeasonalOverride">;
    /** Amount of shipping costs for product returns (for any reason). Applicable when property {@link https://schema.org/returnFees returnFees} equals {@link https://schema.org/ReturnShippingFees ReturnShippingFees}. */
    "returnShippingFeesAmount"?: SchemaValue<MonetaryAmount | IdReference, "returnShippingFeesAmount">;
    /** The membership program tier an Offer (or a PriceSpecification, OfferShippingDetails, or MerchantReturnPolicy under an Offer) is valid for. */
    "validForMemberTier"?: SchemaValue<MemberProgramTier | IdReference, "validForMemberTier">;
}
interface MerchantReturnPolicyLeaf extends MerchantReturnPolicyBase {
    "@type": "MerchantReturnPolicy";
}
/** A MerchantReturnPolicy provides information about product return policies associated with an {@link https://schema.org/Organization Organization}, {@link https://schema.org/Product Product}, or {@link https://schema.org/Offer Offer}. */
export type MerchantReturnPolicy = MerchantReturnPolicyLeaf;
interface MerchantReturnPolicySeasonalOverrideBase extends ThingBase {
    /** The end date and time of the item (in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 date format}). */
    "endDate"?: SchemaValue<Date | DateTime, "endDate">;
    /** Specifies either a fixed return date or the number of days (from the delivery date) that a product can be returned. Used when the {@link https://schema.org/returnPolicyCategory returnPolicyCategory} property is specified as {@link https://schema.org/MerchantReturnFiniteReturnWindow MerchantReturnFiniteReturnWindow}. */
    "merchantReturnDays"?: SchemaValue<Date | DateTime | Integer, "merchantReturnDays">;
    /** A refund type, from an enumerated list. */
    "refundType"?: SchemaValue<RefundTypeEnumeration | IdReference, "refundType">;
    /** Use {@link https://schema.org/MonetaryAmount MonetaryAmount} to specify a fixed restocking fee for product returns, or use {@link https://schema.org/Number Number} to specify a percentage of the product price paid by the customer. */
    "restockingFee"?: SchemaValue<MonetaryAmount | Number | IdReference, "restockingFee">;
    /** The type of return fees for purchased products (for any return reason). */
    "returnFees"?: SchemaValue<ReturnFeesEnumeration | IdReference, "returnFees">;
    /** The type of return method offered, specified from an enumeration. */
    "returnMethod"?: SchemaValue<ReturnMethodEnumeration | IdReference, "returnMethod">;
    /** Specifies an applicable return policy (from an enumeration). */
    "returnPolicyCategory"?: SchemaValue<MerchantReturnEnumeration | IdReference, "returnPolicyCategory">;
    /** Amount of shipping costs for product returns (for any reason). Applicable when property {@link https://schema.org/returnFees returnFees} equals {@link https://schema.org/ReturnShippingFees ReturnShippingFees}. */
    "returnShippingFeesAmount"?: SchemaValue<MonetaryAmount | IdReference, "returnShippingFeesAmount">;
    /** The start date and time of the item (in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 date format}). */
    "startDate"?: SchemaValue<Date | DateTime, "startDate">;
}
interface MerchantReturnPolicySeasonalOverrideLeaf extends MerchantReturnPolicySeasonalOverrideBase {
    "@type": "MerchantReturnPolicySeasonalOverride";
}
/** A seasonal override of a return policy, for example used for holidays. */
export type MerchantReturnPolicySeasonalOverride = MerchantReturnPolicySeasonalOverrideLeaf;
interface MessageBase extends CreativeWorkBase {
    /** A sub property of recipient. The recipient blind copied on a message. */
    "bccRecipient"?: SchemaValue<ContactPoint | Organization | Person | IdReference, "bccRecipient">;
    /** A sub property of recipient. The recipient copied on a message. */
    "ccRecipient"?: SchemaValue<ContactPoint | Organization | Person | IdReference, "ccRecipient">;
    /** The date/time at which the message has been read by the recipient if a single recipient exists. */
    "dateRead"?: SchemaValue<Date | DateTime, "dateRead">;
    /** The date/time the message was received if a single recipient exists. */
    "dateReceived"?: SchemaValue<DateTime, "dateReceived">;
    /** The date/time at which the message was sent. */
    "dateSent"?: SchemaValue<DateTime, "dateSent">;
    /** A CreativeWork attached to the message. */
    "messageAttachment"?: SchemaValue<CreativeWork | IdReference, "messageAttachment">;
    /** A sub property of participant. The participant who is at the receiving end of the action. */
    "recipient"?: SchemaValue<Audience | ContactPoint | Organization | Person | IdReference, "recipient">;
    /** A sub property of participant. The participant who is at the sending end of the action. */
    "sender"?: SchemaValue<Audience | Organization | Person | IdReference, "sender">;
    /** A sub property of recipient. The recipient who was directly sent the message. */
    "toRecipient"?: SchemaValue<Audience | ContactPoint | Organization | Person | IdReference, "toRecipient">;
}
interface MessageLeaf extends MessageBase {
    "@type": "Message";
}
/** A single message from a sender to one or more organizations or people. */
export type Message = MessageLeaf | EmailMessage;
interface MiddleSchoolLeaf extends EducationalOrganizationBase {
    "@type": "MiddleSchool";
}
/** A middle school (typically for children aged around 11-14, although this varies somewhat). */
export type MiddleSchool = MiddleSchoolLeaf | string;
interface MidwiferyLeaf extends LocalBusinessBase {
    "@type": "Midwifery";
}
/** A nurse-like health profession that deals with pregnancy, childbirth, and the postpartum period (including care of the newborn), besides sexual and reproductive health of women throughout their lives. */
export type Midwifery = MidwiferyLeaf | string;
interface MobileApplicationBase extends SoftwareApplicationBase {
    /** Specifies specific carrier(s) requirements for the application (e.g. an application may only work on a specific carrier network). */
    "carrierRequirements"?: SchemaValue<Text, "carrierRequirements">;
}
interface MobileApplicationLeaf extends MobileApplicationBase {
    "@type": "MobileApplication";
}
/** A software application designed specifically to work well on a mobile device such as a telephone. */
export type MobileApplication = MobileApplicationLeaf;
interface MobilePhoneStoreLeaf extends LocalBusinessBase {
    "@type": "MobilePhoneStore";
}
/** A store that sells mobile phones and related accessories. */
export type MobilePhoneStore = MobilePhoneStoreLeaf | string;
interface MolecularEntityBase extends BioChemEntityBase {
    /** A role played by the BioChemEntity within a chemical context. */
    "chemicalRole"?: SchemaValue<DefinedTerm | IdReference, "chemicalRole">;
    /** Non-proprietary identifier for molecular entity that can be used in printed and electronic data sources thus enabling easier linking of diverse data compilations. */
    "inChI"?: SchemaValue<Text, "inChI">;
    /** InChIKey is a hashed version of the full InChI (using the SHA-256 algorithm). */
    "inChIKey"?: SchemaValue<Text, "inChIKey">;
    /** Systematic method of naming chemical compounds as recommended by the International Union of Pure and Applied Chemistry (IUPAC). */
    "iupacName"?: SchemaValue<Text, "iupacName">;
    /** The empirical formula is the simplest whole number ratio of all the atoms in a molecule. */
    "molecularFormula"?: SchemaValue<Text, "molecularFormula">;
    /** This is the molecular weight of the entity being described, not of the parent. Units should be included in the form '<Number> <unit>', for example '12 amu' or as '<QuantitativeValue>. */
    "molecularWeight"?: SchemaValue<QuantitativeValue | Text | IdReference, "molecularWeight">;
    /** The monoisotopic mass is the sum of the masses of the atoms in a molecule using the unbound, ground-state, rest mass of the principal (most abundant) isotope for each element instead of the isotopic average mass. Please include the units in the form '<Number> <unit>', for example '770.230488 g/mol' or as '<QuantitativeValue>. */
    "monoisotopicMolecularWeight"?: SchemaValue<QuantitativeValue | Text | IdReference, "monoisotopicMolecularWeight">;
    /** Intended use of the BioChemEntity by humans. */
    "potentialUse"?: SchemaValue<DefinedTerm | IdReference, "potentialUse">;
    /** A specification in form of a line notation for describing the structure of chemical species using short ASCII strings. Double bond stereochemistry \ indicators may need to be escaped in the string in formats where the backslash is an escape character. */
    "smiles"?: SchemaValue<Text, "smiles">;
}
interface MolecularEntityLeaf extends MolecularEntityBase {
    "@type": "MolecularEntity";
}
/** Any constitutionally or isotopically distinct atom, molecule, ion, ion pair, radical, radical ion, complex, conformer etc., identifiable as a separately distinguishable entity. */
export type MolecularEntity = MolecularEntityLeaf;
interface MonetaryAmountBase extends ThingBase {
    /**
     * The currency in which the monetary amount is expressed.
     *
     * Use standard formats: {@link http://en.wikipedia.org/wiki/ISO_4217 ISO 4217 currency format}, e.g. "USD"; {@link https://en.wikipedia.org/wiki/List_of_cryptocurrencies Ticker symbol} for cryptocurrencies, e.g. "BTC"; well known names for {@link https://en.wikipedia.org/wiki/Local_exchange_trading_system Local Exchange Trading Systems} (LETS) and other currency types, e.g. "Ithaca HOUR".
     */
    "currency"?: SchemaValue<Text, "currency">;
    /** The upper value of some characteristic or property. */
    "maxValue"?: SchemaValue<Number, "maxValue">;
    /** The lower value of some characteristic or property. */
    "minValue"?: SchemaValue<Number, "minValue">;
    /** The date when the item becomes valid. */
    "validFrom"?: SchemaValue<Date | DateTime, "validFrom">;
    /** The date after when the item is not valid. For example the end of an offer, salary period, or a period of opening hours. */
    "validThrough"?: SchemaValue<Date | DateTime, "validThrough">;
    /**
     * The value of a {@link https://schema.org/QuantitativeValue QuantitativeValue} (including {@link https://schema.org/Observation Observation}) or property value node.
     * - For {@link https://schema.org/QuantitativeValue QuantitativeValue} and {@link https://schema.org/MonetaryAmount MonetaryAmount}, the recommended type for values is 'Number'.
     * - For {@link https://schema.org/PropertyValue PropertyValue}, it can be 'Text', 'Number', 'Boolean', or 'StructuredValue'.
     * - Use values from 0123456789 (Unicode 'DIGIT ZERO' (U+0030) to 'DIGIT NINE' (U+0039)) rather than superficially similar Unicode symbols.
     * - Use '.' (Unicode 'FULL STOP' (U+002E)) rather than ',' to indicate a decimal point. Avoid using these symbols as a readability separator.
     */
    "value"?: SchemaValue<Boolean | Number | StructuredValue | Text | IdReference, "value">;
}
interface MonetaryAmountLeaf extends MonetaryAmountBase {
    "@type": "MonetaryAmount";
}
/** A monetary value or range. This type can be used to describe an amount of money such as $50 USD, or a range as in describing a bank account being suitable for a balance between £1,000 and £1,000,000 GBP, or the value of a salary, etc. It is recommended to use {@link https://schema.org/PriceSpecification PriceSpecification} Types to describe the price of an Offer, Invoice, etc. */
export type MonetaryAmount = MonetaryAmountLeaf;
interface MonetaryAmountDistributionBase extends QuantitativeValueDistributionBase {
    /**
     * The currency in which the monetary amount is expressed.
     *
     * Use standard formats: {@link http://en.wikipedia.org/wiki/ISO_4217 ISO 4217 currency format}, e.g. "USD"; {@link https://en.wikipedia.org/wiki/List_of_cryptocurrencies Ticker symbol} for cryptocurrencies, e.g. "BTC"; well known names for {@link https://en.wikipedia.org/wiki/Local_exchange_trading_system Local Exchange Trading Systems} (LETS) and other currency types, e.g. "Ithaca HOUR".
     */
    "currency"?: SchemaValue<Text, "currency">;
}
interface MonetaryAmountDistributionLeaf extends MonetaryAmountDistributionBase {
    "@type": "MonetaryAmountDistribution";
}
/** A statistical distribution of monetary amounts. */
export type MonetaryAmountDistribution = MonetaryAmountDistributionLeaf;
interface MonetaryGrantBase extends GrantBase {
    /** The amount of money. */
    "amount"?: SchemaValue<MonetaryAmount | Number | IdReference, "amount">;
    /** A person or organization that supports (sponsors) something through some kind of financial contribution. */
    "funder"?: SchemaValue<Organization | Person | IdReference, "funder">;
}
interface MonetaryGrantLeaf extends MonetaryGrantBase {
    "@type": "MonetaryGrant";
}
/** A monetary grant. */
export type MonetaryGrant = MonetaryGrantLeaf;
interface MoneyTransferBase extends TransferActionBase {
    /** The amount of money. */
    "amount"?: SchemaValue<MonetaryAmount | Number | IdReference, "amount">;
    /** A bank or bank’s branch, financial institution or international financial institution operating the beneficiary’s bank account or releasing funds for the beneficiary. */
    "beneficiaryBank"?: SchemaValue<BankOrCreditUnion | Text | IdReference, "beneficiaryBank">;
}
interface MoneyTransferLeaf extends MoneyTransferBase {
    "@type": "MoneyTransfer";
}
/** The act of transferring money from one place to another place. This may occur electronically or physically. */
export type MoneyTransfer = MoneyTransferLeaf;
interface MortgageLoanBase extends LoanOrCreditBase {
    /** Whether borrower is a resident of the jurisdiction where the property is located. */
    "domiciledMortgage"?: SchemaValue<Boolean, "domiciledMortgage">;
    /** Amount of mortgage mandate that can be converted into a proper mortgage at a later stage. */
    "loanMortgageMandateAmount"?: SchemaValue<MonetaryAmount | IdReference, "loanMortgageMandateAmount">;
}
interface MortgageLoanLeaf extends MortgageLoanBase {
    "@type": "MortgageLoan";
}
/** A loan in which property or real estate is used as collateral. (A loan securitized against some real estate.) */
export type MortgageLoan = MortgageLoanLeaf;
interface MosqueLeaf extends CivicStructureBase {
    "@type": "Mosque";
}
/** A mosque. */
export type Mosque = MosqueLeaf | string;
interface MotelLeaf extends LodgingBusinessBase {
    "@type": "Motel";
}
/**
 * A motel.
 *
 * See also the {@link /docs/hotels.html dedicated document on the use of schema.org for marking up hotels and other forms of accommodations}.
 */
export type Motel = MotelLeaf | string;
interface MotorcycleLeaf extends VehicleBase {
    "@type": "Motorcycle";
}
/** A motorcycle or motorbike is a single-track, two-wheeled motor vehicle. */
export type Motorcycle = MotorcycleLeaf;
interface MotorcycleDealerLeaf extends LocalBusinessBase {
    "@type": "MotorcycleDealer";
}
/** A motorcycle dealer. */
export type MotorcycleDealer = MotorcycleDealerLeaf | string;
interface MotorcycleRepairLeaf extends LocalBusinessBase {
    "@type": "MotorcycleRepair";
}
/** A motorcycle repair shop. */
export type MotorcycleRepair = MotorcycleRepairLeaf | string;
interface MotorizedBicycleLeaf extends VehicleBase {
    "@type": "MotorizedBicycle";
}
/** A motorized bicycle is a bicycle with an attached motor used to power the vehicle, or to assist with pedaling. */
export type MotorizedBicycle = MotorizedBicycleLeaf;
interface MountainLeaf extends PlaceBase {
    "@type": "Mountain";
}
/** A mountain, like Mount Whitney or Mount Everest. */
export type Mountain = MountainLeaf | string;
interface MoveActionBase extends ActionBase {
    /** A sub property of location. The original location of the object or the agent before the action. */
    "fromLocation"?: SchemaValue<Place | IdReference, "fromLocation">;
    /** A sub property of location. The final location of the object or the agent after the action. */
    "toLocation"?: SchemaValue<Place | IdReference, "toLocation">;
}
interface MoveActionLeaf extends MoveActionBase {
    "@type": "MoveAction";
}
/**
 * The act of an agent relocating to a place.
 *
 * Related actions:
 * - {@link https://schema.org/TransferAction TransferAction}: Unlike TransferAction, the subject of the move is a living Person or Organization rather than an inanimate object.
 */
export type MoveAction = MoveActionLeaf | ArriveAction | DepartAction | TravelAction;
interface MovieBase extends CreativeWorkBase {
    /** An actor (individual or a group), e.g. in TV, radio, movie, video games etc., or in an event. Actors can be associated with individual items or with a series, episode, clip. */
    "actor"?: SchemaValue<PerformingGroup | Person | IdReference, "actor">;
    /**
     * An actor, e.g. in TV, radio, movie, video games etc. Actors can be associated with individual items or with a series, episode, clip.
     *
     * @deprecated Consider using https://schema.org/actor instead.
     */
    "actors"?: SchemaValue<Person | IdReference, "actors">;
    /**
     * The country of origin of something, including products as well as creative works such as movie and TV content.
     *
     * In the case of TV and movie, this would be the country of the principle offices of the production company or individual responsible for the movie. For other kinds of {@link https://schema.org/CreativeWork CreativeWork} it is difficult to provide fully general guidance, and properties such as {@link https://schema.org/contentLocation contentLocation} and {@link https://schema.org/locationCreated locationCreated} may be more applicable.
     *
     * In the case of products, the country of origin of the product. The exact interpretation of this may vary by context and product type, and cannot be fully enumerated here.
     */
    "countryOfOrigin"?: SchemaValue<Country | IdReference, "countryOfOrigin">;
    /** A director of e.g. TV, radio, movie, video gaming etc. content, or of an event. Directors can be associated with individual items or with a series, episode, clip. */
    "director"?: SchemaValue<Person | IdReference, "director">;
    /**
     * A director of e.g. TV, radio, movie, video games etc. content. Directors can be associated with individual items or with a series, episode, clip.
     *
     * @deprecated Consider using https://schema.org/director instead.
     */
    "directors"?: SchemaValue<Person | IdReference, "directors">;
    /** The duration of the item (movie, audio recording, event, etc.) in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 duration format}. */
    "duration"?: SchemaValue<Duration | IdReference, "duration">;
    /** The composer of the soundtrack. */
    "musicBy"?: SchemaValue<MusicGroup | Person | IdReference, "musicBy">;
    /** The production company or studio responsible for the item, e.g. series, video game, episode etc. */
    "productionCompany"?: SchemaValue<Organization | IdReference, "productionCompany">;
    /** Languages in which subtitles/captions are available, in {@link http://tools.ietf.org/html/bcp47 IETF BCP 47 standard format}. */
    "subtitleLanguage"?: SchemaValue<Language | Text | IdReference, "subtitleLanguage">;
    /**
     * An {@link https://eidr.org/ EIDR} (Entertainment Identifier Registry) {@link https://schema.org/identifier identifier} representing at the most general/abstract level, a work of film or television.
     *
     * For example, the motion picture known as "Ghostbusters" has a titleEIDR of "10.5240/7EC7-228A-510A-053E-CBB8-J". This title (or work) may have several variants, which EIDR calls "edits". See {@link https://schema.org/editEIDR editEIDR}.
     *
     * Since schema.org types like {@link https://schema.org/Movie Movie}, {@link https://schema.org/TVEpisode TVEpisode}, {@link https://schema.org/TVSeason TVSeason}, and {@link https://schema.org/TVSeries TVSeries} can be used for both works and their multiple expressions, it is possible to use {@link https://schema.org/titleEIDR titleEIDR} alone (for a general description), or alongside {@link https://schema.org/editEIDR editEIDR} for a more edit-specific description.
     */
    "titleEIDR"?: SchemaValue<Text | URL, "titleEIDR">;
    /** The trailer of a movie or TV/radio series, season, episode, etc. */
    "trailer"?: SchemaValue<VideoObject | IdReference, "trailer">;
}
interface MovieLeaf extends MovieBase {
    "@type": "Movie";
}
/** A movie. */
export type Movie = MovieLeaf;
interface MovieClipLeaf extends ClipBase {
    "@type": "MovieClip";
}
/** A short segment/part of a movie. */
export type MovieClip = MovieClipLeaf;
interface MovieRentalStoreLeaf extends LocalBusinessBase {
    "@type": "MovieRentalStore";
}
/** A movie rental store. */
export type MovieRentalStore = MovieRentalStoreLeaf | string;
interface MovieSeriesBase extends CreativeWorkSeriesBase {
    /** An actor (individual or a group), e.g. in TV, radio, movie, video games etc., or in an event. Actors can be associated with individual items or with a series, episode, clip. */
    "actor"?: SchemaValue<PerformingGroup | Person | IdReference, "actor">;
    /**
     * An actor, e.g. in TV, radio, movie, video games etc. Actors can be associated with individual items or with a series, episode, clip.
     *
     * @deprecated Consider using https://schema.org/actor instead.
     */
    "actors"?: SchemaValue<Person | IdReference, "actors">;
    /** A director of e.g. TV, radio, movie, video gaming etc. content, or of an event. Directors can be associated with individual items or with a series, episode, clip. */
    "director"?: SchemaValue<Person | IdReference, "director">;
    /**
     * A director of e.g. TV, radio, movie, video games etc. content. Directors can be associated with individual items or with a series, episode, clip.
     *
     * @deprecated Consider using https://schema.org/director instead.
     */
    "directors"?: SchemaValue<Person | IdReference, "directors">;
    /** The composer of the soundtrack. */
    "musicBy"?: SchemaValue<MusicGroup | Person | IdReference, "musicBy">;
    /** The production company or studio responsible for the item, e.g. series, video game, episode etc. */
    "productionCompany"?: SchemaValue<Organization | IdReference, "productionCompany">;
    /** The trailer of a movie or TV/radio series, season, episode, etc. */
    "trailer"?: SchemaValue<VideoObject | IdReference, "trailer">;
}
interface MovieSeriesLeaf extends MovieSeriesBase {
    "@type": "MovieSeries";
}
/** A series of movies. Included movies can be indicated with the hasPart property. */
export type MovieSeries = MovieSeriesLeaf;
interface MovieTheaterBase extends CivicStructureBase, LocalBusinessBase {
    /** The number of screens in the movie theater. */
    "screenCount"?: SchemaValue<Number, "screenCount">;
}
interface MovieTheaterLeaf extends MovieTheaterBase {
    "@type": "MovieTheater";
}
/** A movie theater. */
export type MovieTheater = MovieTheaterLeaf | string;
interface MovingCompanyLeaf extends LocalBusinessBase {
    "@type": "MovingCompany";
}
/** A moving company. */
export type MovingCompany = MovingCompanyLeaf | string;
interface MuscleBase extends AnatomicalStructureBase {
    /** The muscle whose action counteracts the specified muscle. */
    "antagonist"?: SchemaValue<Muscle | IdReference, "antagonist">;
    /** The blood vessel that carries blood from the heart to the muscle. */
    "bloodSupply"?: SchemaValue<Vessel | IdReference, "bloodSupply">;
    /** The place of attachment of a muscle, or what the muscle moves. */
    "insertion"?: SchemaValue<AnatomicalStructure | IdReference, "insertion">;
    /** The movement the muscle generates. */
    "muscleAction"?: SchemaValue<Text, "muscleAction">;
    /** The underlying innervation associated with the muscle. */
    "nerve"?: SchemaValue<Nerve | IdReference, "nerve">;
}
interface MuscleLeaf extends MuscleBase {
    "@type": "Muscle";
}
/** A muscle is an anatomical structure consisting of a contractile form of tissue that animals use to effect movement. */
export type Muscle = MuscleLeaf;
interface MuseumLeaf extends CivicStructureBase {
    "@type": "Museum";
}
/** A museum. */
export type Museum = MuseumLeaf | string;
interface MusicAlbumBase extends MusicPlaylistBase {
    /** Classification of the album by its type of content: soundtrack, live album, studio album, etc. */
    "albumProductionType"?: SchemaValue<MusicAlbumProductionType | IdReference, "albumProductionType">;
    /** A release of this album. */
    "albumRelease"?: SchemaValue<MusicRelease | IdReference, "albumRelease">;
    /** The kind of release which this album is: single, EP or album. */
    "albumReleaseType"?: SchemaValue<MusicAlbumReleaseType | IdReference, "albumReleaseType">;
    /** The artist that performed this album or recording. */
    "byArtist"?: SchemaValue<MusicGroup | Person | IdReference, "byArtist">;
}
interface MusicAlbumLeaf extends MusicAlbumBase {
    "@type": "MusicAlbum";
}
/** A collection of music tracks. */
export type MusicAlbum = MusicAlbumLeaf;
interface MusicAlbumProductionTypeLeaf extends EnumerationBase {
    "@type": "MusicAlbumProductionType";
}
/** Classification of the album by its type of content: soundtrack, live album, studio album, etc. */
export type MusicAlbumProductionType = "https://schema.org/CompilationAlbum" | "CompilationAlbum" | "https://schema.org/DemoAlbum" | "DemoAlbum" | "https://schema.org/DJMixAlbum" | "DJMixAlbum" | "https://schema.org/LiveAlbum" | "LiveAlbum" | "https://schema.org/MixtapeAlbum" | "MixtapeAlbum" | "https://schema.org/RemixAlbum" | "RemixAlbum" | "https://schema.org/SoundtrackAlbum" | "SoundtrackAlbum" | "https://schema.org/SpokenWordAlbum" | "SpokenWordAlbum" | "https://schema.org/StudioAlbum" | "StudioAlbum" | MusicAlbumProductionTypeLeaf;
interface MusicAlbumReleaseTypeLeaf extends EnumerationBase {
    "@type": "MusicAlbumReleaseType";
}
/** The kind of release which this album is: single, EP or album. */
export type MusicAlbumReleaseType = "https://schema.org/AlbumRelease" | "AlbumRelease" | "https://schema.org/BroadcastRelease" | "BroadcastRelease" | "https://schema.org/EPRelease" | "EPRelease" | "https://schema.org/SingleRelease" | "SingleRelease" | MusicAlbumReleaseTypeLeaf;
interface MusicCompositionBase extends CreativeWorkBase {
    /** The person or organization who wrote a composition, or who is the composer of a work performed at some event. */
    "composer"?: SchemaValue<Organization | Person | IdReference, "composer">;
    /** The date and place the work was first performed. */
    "firstPerformance"?: SchemaValue<Event | IdReference, "firstPerformance">;
    /** Smaller compositions included in this work (e.g. a movement in a symphony). */
    "includedComposition"?: SchemaValue<MusicComposition | IdReference, "includedComposition">;
    /** The International Standard Musical Work Code for the composition. */
    "iswcCode"?: SchemaValue<Text, "iswcCode">;
    /** The person who wrote the words. */
    "lyricist"?: SchemaValue<Person | IdReference, "lyricist">;
    /** The words in the song. */
    "lyrics"?: SchemaValue<CreativeWork | IdReference, "lyrics">;
    /** The key, mode, or scale this composition uses. */
    "musicalKey"?: SchemaValue<Text, "musicalKey">;
    /** An arrangement derived from the composition. */
    "musicArrangement"?: SchemaValue<MusicComposition | IdReference, "musicArrangement">;
    /** The type of composition (e.g. overture, sonata, symphony, etc.). */
    "musicCompositionForm"?: SchemaValue<Text, "musicCompositionForm">;
    /** An audio recording of the work. */
    "recordedAs"?: SchemaValue<MusicRecording | IdReference, "recordedAs">;
}
interface MusicCompositionLeaf extends MusicCompositionBase {
    "@type": "MusicComposition";
}
/** A musical composition. */
export type MusicComposition = MusicCompositionLeaf;
interface MusicEventLeaf extends EventBase {
    "@type": "MusicEvent";
}
/** Event type: Music event. */
export type MusicEvent = MusicEventLeaf;
interface MusicGroupBase extends OrganizationBase {
    /** A music album. */
    "album"?: SchemaValue<MusicAlbum | IdReference, "album">;
    /**
     * A collection of music albums.
     *
     * @deprecated Consider using https://schema.org/album instead.
     */
    "albums"?: SchemaValue<MusicAlbum | IdReference, "albums">;
    /** Genre of the creative work, broadcast channel or group. */
    "genre"?: SchemaValue<Text | URL, "genre">;
    /**
     * A member of a music group—for example, John, Paul, George, or Ringo.
     *
     * @deprecated Consider using https://schema.org/member instead.
     */
    "musicGroupMember"?: SchemaValue<Person | IdReference, "musicGroupMember">;
    /** A music recording (track)—usually a single song. If an ItemList is given, the list should contain items of type MusicRecording. */
    "track"?: SchemaValue<ItemList | MusicRecording | IdReference, "track">;
    /**
     * A music recording (track)—usually a single song.
     *
     * @deprecated Consider using https://schema.org/track instead.
     */
    "tracks"?: SchemaValue<MusicRecording | IdReference, "tracks">;
}
interface MusicGroupLeaf extends MusicGroupBase {
    "@type": "MusicGroup";
}
/** A musical group, such as a band, an orchestra, or a choir. Can also be a solo musician. */
export type MusicGroup = MusicGroupLeaf | string;
interface MusicPlaylistBase extends CreativeWorkBase {
    /** The number of tracks in this album or playlist. */
    "numTracks"?: SchemaValue<Integer, "numTracks">;
    /** A music recording (track)—usually a single song. If an ItemList is given, the list should contain items of type MusicRecording. */
    "track"?: SchemaValue<ItemList | MusicRecording | IdReference, "track">;
    /**
     * A music recording (track)—usually a single song.
     *
     * @deprecated Consider using https://schema.org/track instead.
     */
    "tracks"?: SchemaValue<MusicRecording | IdReference, "tracks">;
}
interface MusicPlaylistLeaf extends MusicPlaylistBase {
    "@type": "MusicPlaylist";
}
/** A collection of music tracks in playlist form. */
export type MusicPlaylist = MusicPlaylistLeaf | MusicAlbum | MusicRelease;
interface MusicRecordingBase extends CreativeWorkBase {
    /** The artist that performed this album or recording. */
    "byArtist"?: SchemaValue<MusicGroup | Person | IdReference, "byArtist">;
    /** The duration of the item (movie, audio recording, event, etc.) in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 duration format}. */
    "duration"?: SchemaValue<Duration | IdReference, "duration">;
    /** The album to which this recording belongs. */
    "inAlbum"?: SchemaValue<MusicAlbum | IdReference, "inAlbum">;
    /** The playlist to which this recording belongs. */
    "inPlaylist"?: SchemaValue<MusicPlaylist | IdReference, "inPlaylist">;
    /** The International Standard Recording Code for the recording. */
    "isrcCode"?: SchemaValue<Text, "isrcCode">;
    /** The composition this track is a recording of. */
    "recordingOf"?: SchemaValue<MusicComposition | IdReference, "recordingOf">;
}
interface MusicRecordingLeaf extends MusicRecordingBase {
    "@type": "MusicRecording";
}
/** A music recording (track), usually a single song. */
export type MusicRecording = MusicRecordingLeaf;
interface MusicReleaseBase extends MusicPlaylistBase {
    /** The catalog number for the release. */
    "catalogNumber"?: SchemaValue<Text, "catalogNumber">;
    /** The group the release is credited to if different than the byArtist. For example, Red and Blue is credited to "Stefani Germanotta Band", but by Lady Gaga. */
    "creditedTo"?: SchemaValue<Organization | Person | IdReference, "creditedTo">;
    /** The duration of the item (movie, audio recording, event, etc.) in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 duration format}. */
    "duration"?: SchemaValue<Duration | IdReference, "duration">;
    /** Format of this release (the type of recording media used, i.e. compact disc, digital media, LP, etc.). */
    "musicReleaseFormat"?: SchemaValue<MusicReleaseFormatType | IdReference, "musicReleaseFormat">;
    /** The label that issued the release. */
    "recordLabel"?: SchemaValue<Organization | IdReference, "recordLabel">;
    /** The album this is a release of. */
    "releaseOf"?: SchemaValue<MusicAlbum | IdReference, "releaseOf">;
}
interface MusicReleaseLeaf extends MusicReleaseBase {
    "@type": "MusicRelease";
}
/** A MusicRelease is a specific release of a music album. */
export type MusicRelease = MusicReleaseLeaf;
interface MusicReleaseFormatTypeLeaf extends EnumerationBase {
    "@type": "MusicReleaseFormatType";
}
/** Format of this release (the type of recording media used, i.e. compact disc, digital media, LP, etc.). */
export type MusicReleaseFormatType = "https://schema.org/CassetteFormat" | "CassetteFormat" | "https://schema.org/CDFormat" | "CDFormat" | "https://schema.org/DigitalAudioTapeFormat" | "DigitalAudioTapeFormat" | "https://schema.org/DigitalFormat" | "DigitalFormat" | "https://schema.org/DVDFormat" | "DVDFormat" | "https://schema.org/LaserDiscFormat" | "LaserDiscFormat" | "https://schema.org/VinylFormat" | "VinylFormat" | MusicReleaseFormatTypeLeaf;
interface MusicStoreLeaf extends LocalBusinessBase {
    "@type": "MusicStore";
}
/** A music store. */
export type MusicStore = MusicStoreLeaf | string;
interface MusicVenueLeaf extends CivicStructureBase {
    "@type": "MusicVenue";
}
/** A music venue. */
export type MusicVenue = MusicVenueLeaf | string;
interface MusicVideoObjectLeaf extends MediaObjectBase {
    "@type": "MusicVideoObject";
}
/** A music video file. */
export type MusicVideoObject = MusicVideoObjectLeaf;
interface NailSalonLeaf extends LocalBusinessBase {
    "@type": "NailSalon";
}
/** A nail salon. */
export type NailSalon = NailSalonLeaf | string;
interface NerveBase extends AnatomicalStructureBase {
    /**
     * The branches that delineate from the nerve bundle. Not to be confused with {@link https://schema.org/branchOf branchOf}.
     *
     * @deprecated Consider using https://schema.org/arterialBranch instead.
     */
    "branch"?: SchemaValue<AnatomicalStructure | IdReference, "branch">;
    /** The neurological pathway extension that involves muscle control. */
    "nerveMotor"?: SchemaValue<Muscle | IdReference, "nerveMotor">;
    /** The neurological pathway extension that inputs and sends information to the brain or spinal cord. */
    "sensoryUnit"?: SchemaValue<AnatomicalStructure | SuperficialAnatomy | IdReference, "sensoryUnit">;
    /** The neurological pathway that originates the neurons. */
    "sourcedFrom"?: SchemaValue<BrainStructure | IdReference, "sourcedFrom">;
}
interface NerveLeaf extends NerveBase {
    "@type": "Nerve";
}
/** A common pathway for the electrochemical nerve impulses that are transmitted along each of the axons. */
export type Nerve = NerveLeaf;
interface NewsArticleBase extends ArticleBase {
    /**
     * A {@link https://en.wikipedia.org/wiki/Dateline dateline} is a brief piece of text included in news articles that describes where and when the story was written or filed though the date is often omitted. Sometimes only a placename is provided.
     *
     * Structured representations of dateline-related information can also be expressed more explicitly using {@link https://schema.org/locationCreated locationCreated} (which represents where a work was created, e.g. where a news report was written). For location depicted or described in the content, use {@link https://schema.org/contentLocation contentLocation}.
     *
     * Dateline summaries are oriented more towards human readers than towards automated processing, and can vary substantially. Some examples: "BEIRUT, Lebanon, June 2.", "Paris, France", "December 19, 2017 11:43AM Reporting from Washington", "Beijing/Moscow", "QUEZON CITY, Philippines".
     */
    "dateline"?: SchemaValue<Text, "dateline">;
    /** The number of the column in which the NewsArticle appears in the print edition. */
    "printColumn"?: SchemaValue<Text, "printColumn">;
    /** The edition of the print product in which the NewsArticle appears. */
    "printEdition"?: SchemaValue<Text, "printEdition">;
    /** If this NewsArticle appears in print, this field indicates the name of the page on which the article is found. Please note that this field is intended for the exact page name (e.g. A5, B18). */
    "printPage"?: SchemaValue<Text, "printPage">;
    /** If this NewsArticle appears in print, this field indicates the print section in which the article appeared. */
    "printSection"?: SchemaValue<Text, "printSection">;
}
interface NewsArticleLeaf extends NewsArticleBase {
    "@type": "NewsArticle";
}
/**
 * A NewsArticle is an article whose content reports news, or provides background context and supporting materials for understanding the news.
 *
 * A more detailed overview of {@link /docs/news.html schema.org News markup} is also available.
 */
export type NewsArticle = NewsArticleLeaf | AnalysisNewsArticle | AskPublicNewsArticle | BackgroundNewsArticle | OpinionNewsArticle | ReportageNewsArticle | ReviewNewsArticle;
interface NewsMediaOrganizationBase extends OrganizationBase {
    /** For a {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization} or other news-related {@link https://schema.org/Organization Organization}, a statement about public engagement activities (for news media, the newsroom’s), including involving the public - digitally or otherwise -- in coverage decisions, reporting and activities after publication. */
    "actionableFeedbackPolicy"?: SchemaValue<CreativeWork | URL | IdReference, "actionableFeedbackPolicy">;
    /** For an {@link https://schema.org/Organization Organization} (e.g. {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization}), a statement describing (in news media, the newsroom’s) disclosure and correction policy for errors. */
    "correctionsPolicy"?: SchemaValue<CreativeWork | URL | IdReference, "correctionsPolicy">;
    /** Statement on diversity policy by an {@link https://schema.org/Organization Organization} e.g. a {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization}. For a {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization}, a statement describing the newsroom’s diversity policy on both staffing and sources, typically providing staffing data. */
    "diversityPolicy"?: SchemaValue<CreativeWork | URL | IdReference, "diversityPolicy">;
    /** For an {@link https://schema.org/Organization Organization} (often but not necessarily a {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization}), a report on staffing diversity issues. In a news context this might be for example ASNE or RTDNA (US) reports, or self-reported. */
    "diversityStaffingReport"?: SchemaValue<Article | URL | IdReference, "diversityStaffingReport">;
    /** Statement about ethics policy, e.g. of a {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization} regarding journalistic and publishing practices, or of a {@link https://schema.org/Restaurant Restaurant}, a page describing food source policies. In the case of a {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization}, an ethicsPolicy is typically a statement describing the personal, organizational, and corporate standards of behavior expected by the organization. */
    "ethicsPolicy"?: SchemaValue<CreativeWork | URL | IdReference, "ethicsPolicy">;
    /** For a {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization}, a link to the masthead page or a page listing top editorial management. */
    "masthead"?: SchemaValue<CreativeWork | URL | IdReference, "masthead">;
    /** For a {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization}, a statement on coverage priorities, including any public agenda or stance on issues. */
    "missionCoveragePrioritiesPolicy"?: SchemaValue<CreativeWork | URL | IdReference, "missionCoveragePrioritiesPolicy">;
    /** For a {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization} or other news-related {@link https://schema.org/Organization Organization}, a statement explaining when authors of articles are not named in bylines. */
    "noBylinesPolicy"?: SchemaValue<CreativeWork | URL | IdReference, "noBylinesPolicy">;
    /** For an {@link https://schema.org/Organization Organization} (often but not necessarily a {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization}), a description of organizational ownership structure; funding and grants. In a news/media setting, this is with particular reference to editorial independence. Note that the {@link https://schema.org/funder funder} is also available and can be used to make basic funder information machine-readable. */
    "ownershipFundingInfo"?: SchemaValue<AboutPage | CreativeWork | Text | URL | IdReference, "ownershipFundingInfo">;
    /** For an {@link https://schema.org/Organization Organization} (typically a {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization}), a statement about policy on use of unnamed sources and the decision process required. */
    "unnamedSourcesPolicy"?: SchemaValue<CreativeWork | URL | IdReference, "unnamedSourcesPolicy">;
    /** Disclosure about verification and fact-checking processes for a {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization} or other fact-checking {@link https://schema.org/Organization Organization}. */
    "verificationFactCheckingPolicy"?: SchemaValue<CreativeWork | URL | IdReference, "verificationFactCheckingPolicy">;
}
interface NewsMediaOrganizationLeaf extends NewsMediaOrganizationBase {
    "@type": "NewsMediaOrganization";
}
/** A News/Media organization such as a newspaper or TV station. */
export type NewsMediaOrganization = NewsMediaOrganizationLeaf | string;
interface NewspaperLeaf extends CreativeWorkSeriesBase {
    "@type": "Newspaper";
}
/** A publication containing information about varied topics that are pertinent to general information, a geographic area, or a specific subject matter (i.e. business, culture, education). Often published daily. */
export type Newspaper = NewspaperLeaf;
interface NGOLeaf extends OrganizationBase {
    "@type": "NGO";
}
/** Organization: Non-governmental Organization. */
export type NGO = NGOLeaf | string;
interface NightClubLeaf extends LocalBusinessBase {
    "@type": "NightClub";
}
/** A nightclub or discotheque. */
export type NightClub = NightClubLeaf | string;
interface NLNonprofitTypeLeaf extends EnumerationBase {
    "@type": "NLNonprofitType";
}
/** NLNonprofitType: Non-profit organization type originating from the Netherlands. */
export type NLNonprofitType = "https://schema.org/NonprofitANBI" | "NonprofitANBI" | "https://schema.org/NonprofitSBBI" | "NonprofitSBBI" | NLNonprofitTypeLeaf;
interface NonprofitTypeLeaf extends EnumerationBase {
    "@type": "NonprofitType";
}
/** NonprofitType enumerates several kinds of official non-profit types of which a non-profit organization can be. */
export type NonprofitType = NonprofitTypeLeaf | NLNonprofitType | UKNonprofitType | USNonprofitType;
interface NotaryLeaf extends LocalBusinessBase {
    "@type": "Notary";
}
/** A notary. */
export type Notary = NotaryLeaf | string;
interface NoteDigitalDocumentLeaf extends DigitalDocumentBase {
    "@type": "NoteDigitalDocument";
}
/** A file containing a note, primarily for the author. */
export type NoteDigitalDocument = NoteDigitalDocumentLeaf;
interface NursingLeaf extends LocalBusinessBase {
    "@type": "Nursing";
}
/** A health profession of a person formally educated and trained in the care of the sick or infirm person. */
export type Nursing = NursingLeaf | string;
interface NutritionInformationBase extends ThingBase {
    /** The number of calories. */
    "calories"?: SchemaValue<Energy | IdReference, "calories">;
    /** The number of grams of carbohydrates. */
    "carbohydrateContent"?: SchemaValue<Mass | IdReference, "carbohydrateContent">;
    /** The number of milligrams of cholesterol. */
    "cholesterolContent"?: SchemaValue<Mass | IdReference, "cholesterolContent">;
    /** The number of grams of fat. */
    "fatContent"?: SchemaValue<Mass | IdReference, "fatContent">;
    /** The number of grams of fiber. */
    "fiberContent"?: SchemaValue<Mass | IdReference, "fiberContent">;
    /** The number of grams of protein. */
    "proteinContent"?: SchemaValue<Mass | IdReference, "proteinContent">;
    /** The number of grams of saturated fat. */
    "saturatedFatContent"?: SchemaValue<Mass | IdReference, "saturatedFatContent">;
    /** The serving size, in terms of the number of volume or mass. */
    "servingSize"?: SchemaValue<Text, "servingSize">;
    /** The number of milligrams of sodium. */
    "sodiumContent"?: SchemaValue<Mass | IdReference, "sodiumContent">;
    /** The number of grams of sugar. */
    "sugarContent"?: SchemaValue<Mass | IdReference, "sugarContent">;
    /** The number of grams of trans fat. */
    "transFatContent"?: SchemaValue<Mass | IdReference, "transFatContent">;
    /** The number of grams of unsaturated fat. */
    "unsaturatedFatContent"?: SchemaValue<Mass | IdReference, "unsaturatedFatContent">;
}
interface NutritionInformationLeaf extends NutritionInformationBase {
    "@type": "NutritionInformation";
}
/** Nutritional information about the recipe. */
export type NutritionInformation = NutritionInformationLeaf;
interface ObservationBase extends QuantitativeValueBase, ThingBase {
    /** A {@link https://schema.org/marginOfError marginOfError} for an {@link https://schema.org/Observation Observation}. */
    "marginOfError"?: SchemaValue<QuantitativeValue | IdReference, "marginOfError">;
    /** The measuredProperty of an {@link https://schema.org/Observation Observation}, typically via its {@link https://schema.org/StatisticalVariable StatisticalVariable}. There are various kinds of applicable {@link https://schema.org/Property Property}: a schema.org property, a property from other RDF-compatible systems, e.g. W3C RDF Data Cube, Data Commons, Wikidata, or schema.org extensions such as {@link https://www.gs1.org/voc/?show=properties GS1's}. */
    "measuredProperty"?: SchemaValue<Property | IdReference, "measuredProperty">;
    /** Identifies the denominator variable when an observation represents a ratio or percentage. */
    "measurementDenominator"?: SchemaValue<StatisticalVariable | IdReference, "measurementDenominator">;
    /** A subproperty of {@link https://schema.org/measurementTechnique measurementTechnique} that can be used for specifying specific methods, in particular via {@link https://schema.org/MeasurementMethodEnum MeasurementMethodEnum}. */
    "measurementMethod"?: SchemaValue<DefinedTerm | MeasurementMethodEnum | Text | URL | IdReference, "measurementMethod">;
    /** Provides additional qualification to an observation. For example, a GDP observation measures the Nominal value. */
    "measurementQualifier"?: SchemaValue<Enumeration | IdReference, "measurementQualifier">;
    /**
     * A technique, method or technology used in an {@link https://schema.org/Observation Observation}, {@link https://schema.org/StatisticalVariable StatisticalVariable} or {@link https://schema.org/Dataset Dataset} (or {@link https://schema.org/DataDownload DataDownload}, {@link https://schema.org/DataCatalog DataCatalog}), corresponding to the method used for measuring the corresponding variable(s) (for datasets, described using {@link https://schema.org/variableMeasured variableMeasured}; for {@link https://schema.org/Observation Observation}, a {@link https://schema.org/StatisticalVariable StatisticalVariable}). Often but not necessarily each {@link https://schema.org/variableMeasured variableMeasured} will have an explicit representation as (or mapping to) an property such as those defined in Schema.org, or other RDF vocabularies and "knowledge graphs". In that case the subproperty of {@link https://schema.org/variableMeasured variableMeasured} called {@link https://schema.org/measuredProperty measuredProperty} is applicable.
     *
     * The {@link https://schema.org/measurementTechnique measurementTechnique} property helps when extra clarification is needed about how a {@link https://schema.org/measuredProperty measuredProperty} was measured. This is oriented towards scientific and scholarly dataset publication but may have broader applicability; it is not intended as a full representation of measurement, but can often serve as a high level summary for dataset discovery.
     *
     * For example, if {@link https://schema.org/variableMeasured variableMeasured} is: molecule concentration, {@link https://schema.org/measurementTechnique measurementTechnique} could be: "mass spectrometry" or "nmr spectroscopy" or "colorimetry" or "immunofluorescence". If the {@link https://schema.org/variableMeasured variableMeasured} is "depression rating", the {@link https://schema.org/measurementTechnique measurementTechnique} could be "Zung Scale" or "HAM-D" or "Beck Depression Inventory".
     *
     * If there are several {@link https://schema.org/variableMeasured variableMeasured} properties recorded for some given data object, use a {@link https://schema.org/PropertyValue PropertyValue} for each {@link https://schema.org/variableMeasured variableMeasured} and attach the corresponding {@link https://schema.org/measurementTechnique measurementTechnique}. The value can also be from an enumeration, organized as a {@link https://schema.org/MeasurementMetholdEnumeration MeasurementMetholdEnumeration}.
     */
    "measurementTechnique"?: SchemaValue<DefinedTerm | MeasurementMethodEnum | Text | URL | IdReference, "measurementTechnique">;
    /** The {@link https://schema.org/observationAbout observationAbout} property identifies an entity, often a {@link https://schema.org/Place Place}, associated with an {@link https://schema.org/Observation Observation}. */
    "observationAbout"?: SchemaValue<Place | Thing | IdReference, "observationAbout">;
    /** The observationDate of an {@link https://schema.org/Observation Observation}. */
    "observationDate"?: SchemaValue<DateTime, "observationDate">;
    /** The length of time an Observation took place over. The format follows `P[0-9]*[Y|M|D|h|m|s]`. For example, P1Y is Period 1 Year, P3M is Period 3 Months, P3h is Period 3 hours. */
    "observationPeriod"?: SchemaValue<Text, "observationPeriod">;
    /** The variableMeasured property can indicate (repeated as necessary) the variables that are measured in some dataset, either described as text or as pairs of identifier and description using PropertyValue, or more explicitly as a {@link https://schema.org/StatisticalVariable StatisticalVariable}. */
    "variableMeasured"?: SchemaValue<Property | PropertyValue | StatisticalVariable | Text | IdReference, "variableMeasured">;
}
interface ObservationLeaf extends ObservationBase {
    "@type": "Observation";
}
/**
 * Instances of the class {@link https://schema.org/Observation Observation} are used to specify observations about an entity at a particular time. The principal properties of an {@link https://schema.org/Observation Observation} are {@link https://schema.org/observationAbout observationAbout}, {@link https://schema.org/measuredProperty measuredProperty}, {@link https://schema.org/statType statType}, [[value] and {@link https://schema.org/observationDate observationDate} and {@link https://schema.org/measuredProperty measuredProperty}. Some but not all Observations represent a {@link https://schema.org/QuantitativeValue QuantitativeValue}. Quantitative observations can be about a {@link https://schema.org/StatisticalVariable StatisticalVariable}, which is an abstract specification about which we can make observations that are grounded at a particular location and time.
 *
 * Observations can also encode a subset of simple RDF-like statements (its observationAbout, a StatisticalVariable, defining the measuredPoperty; its observationAbout property indicating the entity the statement is about, and {@link https://schema.org/value value} )
 *
 * In the context of a quantitative knowledge graph, typical properties could include {@link https://schema.org/measuredProperty measuredProperty}, {@link https://schema.org/observationAbout observationAbout}, {@link https://schema.org/observationDate observationDate}, {@link https://schema.org/value value}, {@link https://schema.org/unitCode unitCode}, {@link https://schema.org/unitText unitText}, {@link https://schema.org/measurementMethod measurementMethod}.
 */
export type Observation = ObservationLeaf;
interface ObstetricLeaf extends LocalBusinessBase {
    "@type": "Obstetric";
}
/** A specific branch of medical science that specializes in the care of women during the prenatal and postnatal care and with the delivery of the child. */
export type Obstetric = ObstetricLeaf | string;
interface OccupationBase extends ThingBase {
    /** Educational background needed for the position or Occupation. */
    "educationRequirements"?: SchemaValue<EducationalOccupationalCredential | Text | IdReference, "educationRequirements">;
    /** An estimated salary for a job posting or occupation, based on a variety of variables including, but not limited to industry, job title, and location. Estimated salaries are often computed by outside organizations rather than the hiring organization, who may not have committed to the estimated value. */
    "estimatedSalary"?: SchemaValue<MonetaryAmount | MonetaryAmountDistribution | Number | IdReference, "estimatedSalary">;
    /** Description of skills and experience needed for the position or Occupation. */
    "experienceRequirements"?: SchemaValue<OccupationalExperienceRequirements | Text | IdReference, "experienceRequirements">;
    /**
     * A category describing the job, preferably using a term from a taxonomy such as {@link http://www.onetcenter.org/taxonomy.html BLS O*NET-SOC}, {@link https://www.ilo.org/public/english/bureau/stat/isco/isco08/ ISCO-08} or similar, with the property repeated for each applicable value. Ideally the taxonomy should be identified, and both the textual label and formal code for the category should be provided.
     *
     * Note: for historical reasons, any textual label and formal code provided as a literal may be assumed to be from O*NET-SOC.
     */
    "occupationalCategory"?: SchemaValue<CategoryCode | Text | IdReference, "occupationalCategory">;
    /** The region/country for which this occupational description is appropriate. Note that educational requirements and qualifications can vary between jurisdictions. */
    "occupationLocation"?: SchemaValue<AdministrativeArea | IdReference, "occupationLocation">;
    /** Specific qualifications required for this role or Occupation. */
    "qualifications"?: SchemaValue<EducationalOccupationalCredential | Text | IdReference, "qualifications">;
    /** Responsibilities associated with this role or Occupation. */
    "responsibilities"?: SchemaValue<Text, "responsibilities">;
    /** A statement of knowledge, skill, ability, task or any other assertion expressing a competency that is either claimed by a person, an organization or desired or required to fulfill a role or to work in an occupation. */
    "skills"?: SchemaValue<DefinedTerm | Text | IdReference, "skills">;
}
interface OccupationLeaf extends OccupationBase {
    "@type": "Occupation";
}
/** A profession, may involve prolonged training and/or a formal qualification. */
export type Occupation = OccupationLeaf;
interface OccupationalExperienceRequirementsBase extends ThingBase {
    /** Indicates the minimal number of months of experience required for a position. */
    "monthsOfExperience"?: SchemaValue<Number, "monthsOfExperience">;
}
interface OccupationalExperienceRequirementsLeaf extends OccupationalExperienceRequirementsBase {
    "@type": "OccupationalExperienceRequirements";
}
/** Indicates employment-related experience requirements, e.g. {@link https://schema.org/monthsOfExperience monthsOfExperience}. */
export type OccupationalExperienceRequirements = OccupationalExperienceRequirementsLeaf;
interface OccupationalTherapyLeaf extends MedicalTherapyBase {
    "@type": "OccupationalTherapy";
}
/** A treatment of people with physical, emotional, or social problems, using purposeful activity to help them overcome or learn to deal with their problems. */
export type OccupationalTherapy = OccupationalTherapyLeaf;
interface OceanBodyOfWaterLeaf extends PlaceBase {
    "@type": "OceanBodyOfWater";
}
/** An ocean (for example, the Pacific). */
export type OceanBodyOfWater = OceanBodyOfWaterLeaf | string;
interface OfferBase extends ThingBase {
    /** The payment method(s) that are accepted in general by an organization, or for some specific demand or offer. */
    "acceptedPaymentMethod"?: SchemaValue<LoanOrCredit | PaymentMethod | Text | IdReference, "acceptedPaymentMethod">;
    /**
     * A property-value pair representing an additional characteristic of the entity, e.g. a product feature or another characteristic for which there is no matching property in schema.org.
     *
     * Note: Publishers should be aware that applications designed to use specific schema.org properties (e.g. https://schema.org/width, https://schema.org/color, https://schema.org/gtin13, ...) will typically expect such data to be provided using those properties, rather than using the generic property/value mechanism.
     */
    "additionalProperty"?: SchemaValue<PropertyValue | IdReference, "additionalProperty">;
    /** An additional offer that can only be obtained in combination with the first base offer (e.g. supplements and extensions that are available for a surcharge). */
    "addOn"?: SchemaValue<Offer | IdReference, "addOn">;
    /** The amount of time that is required between accepting the offer and the actual usage of the resource or service. */
    "advanceBookingRequirement"?: SchemaValue<QuantitativeValue | IdReference, "advanceBookingRequirement">;
    /** The overall rating, based on a collection of reviews or ratings, of the item. */
    "aggregateRating"?: SchemaValue<AggregateRating | IdReference, "aggregateRating">;
    /** The geographic area where a service or offered item is provided. */
    "areaServed"?: SchemaValue<AdministrativeArea | GeoShape | Place | Text | IdReference, "areaServed">;
    /**
     * An Amazon Standard Identification Number (ASIN) is a 10-character alphanumeric unique identifier assigned by Amazon.com and its partners for product identification within the Amazon organization (summary from {@link https://en.wikipedia.org/wiki/Amazon_Standard_Identification_Number Wikipedia}'s article).
     *
     * Note also that this is a definition for how to include ASINs in Schema.org data, and not a definition of ASINs in general - see documentation from Amazon for authoritative details. ASINs are most commonly encoded as text strings, but the [asin] property supports URL/URI as potential values too.
     */
    "asin"?: SchemaValue<Text | URL, "asin">;
    /** The availability of this item—for example In stock, Out of stock, Pre-order, etc. */
    "availability"?: SchemaValue<ItemAvailability | IdReference, "availability">;
    /** The end of the availability of the product or service included in the offer. */
    "availabilityEnds"?: SchemaValue<Date | DateTime | Time, "availabilityEnds">;
    /** The beginning of the availability of the product or service included in the offer. */
    "availabilityStarts"?: SchemaValue<Date | DateTime | Time, "availabilityStarts">;
    /** The place(s) from which the offer can be obtained (e.g. store locations). */
    "availableAtOrFrom"?: SchemaValue<Place | IdReference, "availableAtOrFrom">;
    /** The delivery method(s) available for this offer. */
    "availableDeliveryMethod"?: SchemaValue<DeliveryMethod | IdReference, "availableDeliveryMethod">;
    /** The business function (e.g. sell, lease, repair, dispose) of the offer or component of a bundle (TypeAndQuantityNode). The default is http://purl.org/goodrelations/v1#Sell. */
    "businessFunction"?: SchemaValue<BusinessFunction | IdReference, "businessFunction">;
    /** A category for the item. Greater signs or slashes can be used to informally indicate a category hierarchy. */
    "category"?: SchemaValue<CategoryCode | PhysicalActivityCategory | Text | Thing | URL | IdReference, "category">;
    /** A URL template (RFC 6570) for a checkout page for an offer. This approach allows merchants to specify a URL for online checkout of the offered product, by interpolating parameters such as the logged in user ID, product ID, quantity, discount code etc. Parameter naming and standardization are not specified here. */
    "checkoutPageURLTemplate"?: SchemaValue<Text, "checkoutPageURLTemplate">;
    /** The typical delay between the receipt of the order and the goods either leaving the warehouse or being prepared for pickup, in case the delivery method is on site pickup. */
    "deliveryLeadTime"?: SchemaValue<QuantitativeValue | IdReference, "deliveryLeadTime">;
    /** The type(s) of customers for which the given offer is valid. */
    "eligibleCustomerType"?: SchemaValue<BusinessEntityType | IdReference, "eligibleCustomerType">;
    /** The duration for which the given offer is valid. */
    "eligibleDuration"?: SchemaValue<QuantitativeValue | IdReference, "eligibleDuration">;
    /** The interval and unit of measurement of ordering quantities for which the offer or price specification is valid. This allows e.g. specifying that a certain freight charge is valid only for a certain quantity. */
    "eligibleQuantity"?: SchemaValue<QuantitativeValue | IdReference, "eligibleQuantity">;
    /**
     * The ISO 3166-1 (ISO 3166-1 alpha-2) or ISO 3166-2 code, the place, or the GeoShape for the geo-political region(s) for which the offer or delivery charge specification is valid.
     *
     * See also {@link https://schema.org/ineligibleRegion ineligibleRegion}.
     */
    "eligibleRegion"?: SchemaValue<GeoShape | Place | Text | IdReference, "eligibleRegion">;
    /** The transaction volume, in a monetary unit, for which the offer or price specification is valid, e.g. for indicating a minimal purchasing volume, to express free shipping above a certain order volume, or to limit the acceptance of credit cards to purchases to a certain minimal amount. */
    "eligibleTransactionVolume"?: SchemaValue<PriceSpecification | IdReference, "eligibleTransactionVolume">;
    /**
     * A Global Trade Item Number ({@link https://www.gs1.org/standards/id-keys/gtin GTIN}). GTINs identify trade items, including products and services, using numeric identification codes.
     *
     * A correct {@link https://schema.org/gtin gtin} value should be a valid GTIN, which means that it should be an all-numeric string of either 8, 12, 13 or 14 digits, or a "GS1 Digital Link" URL based on such a string. The numeric component should also have a {@link https://www.gs1.org/services/check-digit-calculator valid GS1 check digit} and meet the other rules for valid GTINs. See also {@link http://www.gs1.org/barcodes/technical/idkeys/gtin GS1's GTIN Summary} and {@link https://en.wikipedia.org/wiki/Global_Trade_Item_Number Wikipedia} for more details. Left-padding of the gtin values is not required or encouraged. The {@link https://schema.org/gtin gtin} property generalizes the earlier {@link https://schema.org/gtin8 gtin8}, {@link https://schema.org/gtin12 gtin12}, {@link https://schema.org/gtin13 gtin13}, and {@link https://schema.org/gtin14 gtin14} properties.
     *
     * The GS1 {@link https://www.gs1.org/standards/Digital-Link/ digital link specifications} expresses GTINs as URLs (URIs, IRIs, etc.). Digital Links should be populated into the {@link https://schema.org/hasGS1DigitalLink hasGS1DigitalLink} attribute.
     *
     * Note also that this is a definition for how to include GTINs in Schema.org data, and not a definition of GTINs in general - see the GS1 documentation for authoritative details.
     */
    "gtin"?: SchemaValue<Text | URL, "gtin">;
    /** The GTIN-12 code of the product, or the product to which the offer refers. The GTIN-12 is the 12-digit GS1 Identification Key composed of a U.P.C. Company Prefix, Item Reference, and Check Digit used to identify trade items. See {@link http://www.gs1.org/barcodes/technical/idkeys/gtin GS1 GTIN Summary} for more details. */
    "gtin12"?: SchemaValue<Text, "gtin12">;
    /** The GTIN-13 code of the product, or the product to which the offer refers. This is equivalent to 13-digit ISBN codes and EAN UCC-13. Former 12-digit UPC codes can be converted into a GTIN-13 code by simply adding a preceding zero. See {@link http://www.gs1.org/barcodes/technical/idkeys/gtin GS1 GTIN Summary} for more details. */
    "gtin13"?: SchemaValue<Text, "gtin13">;
    /** The GTIN-14 code of the product, or the product to which the offer refers. See {@link http://www.gs1.org/barcodes/technical/idkeys/gtin GS1 GTIN Summary} for more details. */
    "gtin14"?: SchemaValue<Text, "gtin14">;
    /** The GTIN-8 code of the product, or the product to which the offer refers. This code is also known as EAN/UCC-8 or 8-digit EAN. See {@link http://www.gs1.org/barcodes/technical/idkeys/gtin GS1 GTIN Summary} for more details. */
    "gtin8"?: SchemaValue<Text, "gtin8">;
    /** Used to tag an item to be intended or suitable for consumption or use by adults only. */
    "hasAdultConsideration"?: SchemaValue<AdultOrientedEnumeration | IdReference, "hasAdultConsideration">;
    /**
     * The {@link https://www.gs1.org/standards/gs1-digital-link GS1 digital link} associated with the object. This URL should conform to the particular requirements of digital links. The link should only contain the Application Identifiers (AIs) that are relevant for the entity being annotated, for instance a [[Product]] or an [[Organization]], and for the correct granularity. In particular, for products:- A Digital Link that contains a serial number (AI `21`) should only be present on instances of [[IndividualProduct]]
     * - A Digital Link that contains a lot number (AI `10`) should be annotated as [[SomeProduct]] if only products from that lot are sold, or [[IndividualProduct]] if there is only a specific product.
     * - A Digital Link that contains a global model number (AI `8013`) should be attached to a [[Product]] or a [[ProductModel]].
     * Other item types should be adapted similarly.
     */
    "hasGS1DigitalLink"?: SchemaValue<URL, "hasGS1DigitalLink">;
    /** A measurement of an item, For example, the inseam of pants, the wheel size of a bicycle, the gauge of a screw, or the carbon footprint measured for certification by an authority. Usually an exact measurement, but can also be a range of measurements for adjustable products, for example belts and ski bindings. */
    "hasMeasurement"?: SchemaValue<QuantitativeValue | IdReference, "hasMeasurement">;
    /** Specifies a MerchantReturnPolicy that may be applicable. */
    "hasMerchantReturnPolicy"?: SchemaValue<MerchantReturnPolicy | IdReference, "hasMerchantReturnPolicy">;
    /** This links to a node or nodes indicating the exact quantity of the products included in an {@link https://schema.org/Offer Offer} or {@link https://schema.org/ProductCollection ProductCollection}. */
    "includesObject"?: SchemaValue<TypeAndQuantityNode | IdReference, "includesObject">;
    /**
     * The ISO 3166-1 (ISO 3166-1 alpha-2) or ISO 3166-2 code, the place, or the GeoShape for the geo-political region(s) for which the offer or delivery charge specification is not valid, e.g. a region where the transaction is not allowed.
     *
     * See also {@link https://schema.org/eligibleRegion eligibleRegion}.
     */
    "ineligibleRegion"?: SchemaValue<GeoShape | Place | Text | IdReference, "ineligibleRegion">;
    /** The current approximate inventory level for the item or items. */
    "inventoryLevel"?: SchemaValue<QuantitativeValue | IdReference, "inventoryLevel">;
    /** Indicates whether this content is family friendly. */
    "isFamilyFriendly"?: SchemaValue<Boolean, "isFamilyFriendly">;
    /** A predefined value from OfferItemCondition specifying the condition of the product or service, or the products or services included in the offer. Also used for product return policies to specify the condition of products accepted for returns. */
    "itemCondition"?: SchemaValue<OfferItemCondition | IdReference, "itemCondition">;
    /** An item being offered (or demanded). The transactional nature of the offer or demand is documented using {@link https://schema.org/businessFunction businessFunction}, e.g. sell, lease etc. While several common expected types are listed explicitly in this definition, others can be used. Using a second type, such as Product or a subtype of Product, can clarify the nature of the offer. */
    "itemOffered"?: SchemaValue<AggregateOffer | CreativeWork | Event | MenuItem | Product | Service | Trip | IdReference, "itemOffered">;
    /** Length of the lease for some {@link https://schema.org/Accommodation Accommodation}, either particular to some {@link https://schema.org/Offer Offer} or in some cases intrinsic to the property. */
    "leaseLength"?: SchemaValue<Duration | QuantitativeValue | IdReference, "leaseLength">;
    /**
     * The {@link https://schema.org/mobileUrl mobileUrl} property is provided for specific situations in which data consumers need to determine whether one of several provided URLs is a dedicated 'mobile site'.
     *
     * To discourage over-use, and reflecting intial usecases, the property is expected only on {@link https://schema.org/Product Product} and {@link https://schema.org/Offer Offer}, rather than {@link https://schema.org/Thing Thing}. The general trend in web technology is towards {@link https://en.wikipedia.org/wiki/Responsive_web_design responsive design} in which content can be flexibly adapted to a wide range of browsing environments. Pages and sites referenced with the long-established {@link https://schema.org/url url} property should ideally also be usable on a wide variety of devices, including mobile phones. In most cases, it would be pointless and counter productive to attempt to update all {@link https://schema.org/url url} markup to use {@link https://schema.org/mobileUrl mobileUrl} for more mobile-oriented pages. The property is intended for the case when items (primarily {@link https://schema.org/Product Product} and {@link https://schema.org/Offer Offer}) have extra URLs hosted on an additional "mobile site" alongside the main one. It should not be taken as an endorsement of this publication style.
     */
    "mobileUrl"?: SchemaValue<Text, "mobileUrl">;
    /** The Manufacturer Part Number (MPN) of the product, or the product to which the offer refers. */
    "mpn"?: SchemaValue<Text, "mpn">;
    /** A pointer to the organization or person making the offer. */
    "offeredBy"?: SchemaValue<Organization | Person | IdReference, "offeredBy">;
    /**
     * The offer price of a product, or of a price component when attached to PriceSpecification and its subtypes.
     *
     * Usage guidelines:
     * - Use the {@link https://schema.org/priceCurrency priceCurrency} property (with standard formats: {@link http://en.wikipedia.org/wiki/ISO_4217 ISO 4217 currency format}, e.g. "USD"; {@link https://en.wikipedia.org/wiki/List_of_cryptocurrencies Ticker symbol} for cryptocurrencies, e.g. "BTC"; well known names for {@link https://en.wikipedia.org/wiki/Local_exchange_trading_system Local Exchange Trading Systems} (LETS) and other currency types, e.g. "Ithaca HOUR") instead of including {@link http://en.wikipedia.org/wiki/Dollar_sign#Currencies_that_use_the_dollar_or_peso_sign ambiguous symbols} such as '$' in the value.
     * - Use '.' (Unicode 'FULL STOP' (U+002E)) rather than ',' to indicate a decimal point. Avoid using these symbols as a readability separator.
     * - Note that both {@link http://www.w3.org/TR/xhtml-rdfa-primer/#using-the-content-attribute RDFa} and Microdata syntax allow the use of a "content=" attribute for publishing simple machine-readable values alongside more human-friendly formatting.
     * - Use values from 0123456789 (Unicode 'DIGIT ZERO' (U+0030) to 'DIGIT NINE' (U+0039)) rather than superficially similar Unicode symbols.
     */
    "price"?: SchemaValue<Number | Text, "price">;
    /**
     * The currency of the price, or a price component when attached to {@link https://schema.org/PriceSpecification PriceSpecification} and its subtypes.
     *
     * Use standard formats: {@link http://en.wikipedia.org/wiki/ISO_4217 ISO 4217 currency format}, e.g. "USD"; {@link https://en.wikipedia.org/wiki/List_of_cryptocurrencies Ticker symbol} for cryptocurrencies, e.g. "BTC"; well known names for {@link https://en.wikipedia.org/wiki/Local_exchange_trading_system Local Exchange Trading Systems} (LETS) and other currency types, e.g. "Ithaca HOUR".
     */
    "priceCurrency"?: SchemaValue<Text, "priceCurrency">;
    /** One or more detailed price specifications, indicating the unit price and delivery or payment charges. */
    "priceSpecification"?: SchemaValue<PriceSpecification | IdReference, "priceSpecification">;
    /** The date after which the price is no longer available. */
    "priceValidUntil"?: SchemaValue<Date, "priceValidUntil">;
    /** A review of the item. */
    "review"?: SchemaValue<Review | IdReference, "review">;
    /**
     * Review of the item.
     *
     * @deprecated Consider using https://schema.org/review instead.
     */
    "reviews"?: SchemaValue<Review | IdReference, "reviews">;
    /** An entity which offers (sells / leases / lends / loans) the services / goods. A seller may also be a provider. */
    "seller"?: SchemaValue<Organization | Person | IdReference, "seller">;
    /** The serial number or any alphanumeric identifier of a particular product. When attached to an offer, it is a shortcut for the serial number of the product included in the offer. */
    "serialNumber"?: SchemaValue<Text, "serialNumber">;
    /** Indicates information about the shipping policies and options associated with an {@link https://schema.org/Offer Offer}. */
    "shippingDetails"?: SchemaValue<OfferShippingDetails | IdReference, "shippingDetails">;
    /** The Stock Keeping Unit (SKU), i.e. a merchant-specific identifier for a product or service, or the product to which the offer refers. */
    "sku"?: SchemaValue<Text, "sku">;
    /** The membership program tier an Offer (or a PriceSpecification, OfferShippingDetails, or MerchantReturnPolicy under an Offer) is valid for. */
    "validForMemberTier"?: SchemaValue<MemberProgramTier | IdReference, "validForMemberTier">;
    /** The date when the item becomes valid. */
    "validFrom"?: SchemaValue<Date | DateTime, "validFrom">;
    /** The date after when the item is not valid. For example the end of an offer, salary period, or a period of opening hours. */
    "validThrough"?: SchemaValue<Date | DateTime, "validThrough">;
    /** The warranty promise(s) included in the offer. */
    "warranty"?: SchemaValue<WarrantyPromise | IdReference, "warranty">;
}
interface OfferLeaf extends OfferBase {
    "@type": "Offer";
}
/**
 * An offer to transfer some rights to an item or to provide a service — for example, an offer to sell tickets to an event, to rent the DVD of a movie, to stream a TV show over the internet, to repair a motorcycle, or to loan a book.
 *
 * Note: As the {@link https://schema.org/businessFunction businessFunction} property, which identifies the form of offer (e.g. sell, lease, repair, dispose), defaults to http://purl.org/goodrelations/v1#Sell; an Offer without a defined businessFunction value can be assumed to be an offer to sell.
 *
 * For {@link http://www.gs1.org/barcodes/technical/idkeys/gtin GTIN}-related fields, see {@link http://www.gs1.org/barcodes/support/check_digit_calculator Check Digit calculator} and {@link http://www.gs1us.org/resources/standards/gtin-validation-guide validation guide} from {@link http://www.gs1.org/ GS1}.
 */
export type Offer = OfferLeaf | AggregateOffer | OfferForLease | OfferForPurchase;
interface OfferCatalogLeaf extends ItemListBase {
    "@type": "OfferCatalog";
}
/** An OfferCatalog is an ItemList that contains related Offers and/or further OfferCatalogs that are offeredBy the same provider. */
export type OfferCatalog = OfferCatalogLeaf;
interface OfferForLeaseLeaf extends OfferBase {
    "@type": "OfferForLease";
}
/** An {@link https://schema.org/OfferForLease OfferForLease} in Schema.org represents an {@link https://schema.org/Offer Offer} to lease out something, i.e. an {@link https://schema.org/Offer Offer} whose {@link https://schema.org/businessFunction businessFunction} is {@link http://purl.org/goodrelations/v1#LeaseOut. lease out}. See {@link https://en.wikipedia.org/wiki/GoodRelations Good Relations} for background on the underlying concepts. */
export type OfferForLease = OfferForLeaseLeaf;
interface OfferForPurchaseLeaf extends OfferBase {
    "@type": "OfferForPurchase";
}
/** An {@link https://schema.org/OfferForPurchase OfferForPurchase} in Schema.org represents an {@link https://schema.org/Offer Offer} to sell something, i.e. an {@link https://schema.org/Offer Offer} whose {@link https://schema.org/businessFunction businessFunction} is {@link http://purl.org/goodrelations/v1#Sell. sell}. See {@link https://en.wikipedia.org/wiki/GoodRelations Good Relations} for background on the underlying concepts. */
export type OfferForPurchase = OfferForPurchaseLeaf;
interface OfferItemConditionLeaf extends EnumerationBase {
    "@type": "OfferItemCondition";
}
/** A list of possible conditions for the item. */
export type OfferItemCondition = "https://schema.org/DamagedCondition" | "DamagedCondition" | "https://schema.org/NewCondition" | "NewCondition" | "https://schema.org/RefurbishedCondition" | "RefurbishedCondition" | "https://schema.org/UsedCondition" | "UsedCondition" | OfferItemConditionLeaf;
interface OfferShippingDetailsBase extends ThingBase {
    /** The total delay between the receipt of the order and the goods reaching the final customer. */
    "deliveryTime"?: SchemaValue<ShippingDeliveryTime | IdReference, "deliveryTime">;
    /** The depth of the item. */
    "depth"?: SchemaValue<Distance | QuantitativeValue | IdReference, "depth">;
    /** Indicates when shipping to a particular {@link https://schema.org/shippingDestination shippingDestination} is not available. */
    "doesNotShip"?: SchemaValue<Boolean, "doesNotShip">;
    /** The height of the item. */
    "height"?: SchemaValue<Distance | QuantitativeValue | IdReference, "height">;
    /** indicates (possibly multiple) shipping destinations. These can be defined in several ways, e.g. postalCode ranges. */
    "shippingDestination"?: SchemaValue<DefinedRegion | IdReference, "shippingDestination">;
    /** Label to match an {@link https://schema.org/OfferShippingDetails OfferShippingDetails} with a {@link https://schema.org/ShippingRateSettings ShippingRateSettings} (within the context of a {@link https://schema.org/shippingSettingsLink shippingSettingsLink} cross-reference). */
    "shippingLabel"?: SchemaValue<Text, "shippingLabel">;
    /** Indicates the origin of a shipment, i.e. where it should be coming from. */
    "shippingOrigin"?: SchemaValue<DefinedRegion | IdReference, "shippingOrigin">;
    /** The shipping rate is the cost of shipping to the specified destination. Typically, the maxValue and currency values (of the {@link https://schema.org/MonetaryAmount MonetaryAmount}) are most appropriate. */
    "shippingRate"?: SchemaValue<MonetaryAmount | IdReference, "shippingRate">;
    /** Link to a page containing {@link https://schema.org/ShippingRateSettings ShippingRateSettings} and {@link https://schema.org/DeliveryTimeSettings DeliveryTimeSettings} details. */
    "shippingSettingsLink"?: SchemaValue<URL, "shippingSettingsLink">;
    /** Label to match an {@link https://schema.org/OfferShippingDetails OfferShippingDetails} with a {@link https://schema.org/DeliveryTimeSettings DeliveryTimeSettings} (within the context of a {@link https://schema.org/shippingSettingsLink shippingSettingsLink} cross-reference). */
    "transitTimeLabel"?: SchemaValue<Text, "transitTimeLabel">;
    /** The membership program tier an Offer (or a PriceSpecification, OfferShippingDetails, or MerchantReturnPolicy under an Offer) is valid for. */
    "validForMemberTier"?: SchemaValue<MemberProgramTier | IdReference, "validForMemberTier">;
    /** The weight of the product or person. */
    "weight"?: SchemaValue<QuantitativeValue | IdReference, "weight">;
    /** The width of the item. */
    "width"?: SchemaValue<Distance | QuantitativeValue | IdReference, "width">;
}
interface OfferShippingDetailsLeaf extends OfferShippingDetailsBase {
    "@type": "OfferShippingDetails";
}
/**
 * OfferShippingDetails represents information about shipping destinations.
 *
 * Multiple of these entities can be used to represent different shipping rates for different destinations:
 *
 * One entity for Alaska/Hawaii. A different one for continental US. A different one for all France.
 *
 * Multiple of these entities can be used to represent different shipping costs and delivery times.
 *
 * Two entities that are identical but differ in rate and time:
 *
 * E.g. Cheaper and slower: $5 in 5-7 days or Fast and expensive: $15 in 1-2 days.
 */
export type OfferShippingDetails = OfferShippingDetailsLeaf;
interface OfficeEquipmentStoreLeaf extends LocalBusinessBase {
    "@type": "OfficeEquipmentStore";
}
/** An office equipment store. */
export type OfficeEquipmentStore = OfficeEquipmentStoreLeaf | string;
interface OncologicLeaf extends LocalBusinessBase {
    "@type": "Oncologic";
}
/** A specific branch of medical science that deals with benign and malignant tumors, including the study of their development, diagnosis, treatment and prevention. */
export type Oncologic = OncologicLeaf | string;
interface OnDemandEventLeaf extends PublicationEventBase {
    "@type": "OnDemandEvent";
}
/** A publication event, e.g. catch-up TV or radio podcast, during which a program is available on-demand. */
export type OnDemandEvent = OnDemandEventLeaf;
interface OnlineBusinessLeaf extends OrganizationBase {
    "@type": "OnlineBusiness";
}
/** A particular online business, either standalone or the online part of a broader organization. Examples include an eCommerce site, an online travel booking site, an online learning site, an online logistics and shipping provider, an online (virtual) doctor, etc. */
export type OnlineBusiness = OnlineBusinessLeaf | OnlineStore | string;
interface OnlineStoreLeaf extends OrganizationBase {
    "@type": "OnlineStore";
}
/** An eCommerce site. */
export type OnlineStore = OnlineStoreLeaf | string;
interface OpeningHoursSpecificationBase extends ThingBase {
    /** The closing hour of the place or service on the given day(s) of the week. */
    "closes"?: SchemaValue<Time, "closes">;
    /** The day of the week for which these opening hours are valid. */
    "dayOfWeek"?: SchemaValue<DayOfWeek | IdReference, "dayOfWeek">;
    /** The opening hour of the place or service on the given day(s) of the week. */
    "opens"?: SchemaValue<Time, "opens">;
    /** The date when the item becomes valid. */
    "validFrom"?: SchemaValue<Date | DateTime, "validFrom">;
    /** The date after when the item is not valid. For example the end of an offer, salary period, or a period of opening hours. */
    "validThrough"?: SchemaValue<Date | DateTime, "validThrough">;
}
interface OpeningHoursSpecificationLeaf extends OpeningHoursSpecificationBase {
    "@type": "OpeningHoursSpecification";
}
/**
 * A structured value providing information about the opening hours of a place or a certain service inside a place.
 *
 * The place is __open__ if the {@link https://schema.org/opens opens} property is specified, and __closed__ otherwise.
 *
 * If the value for the {@link https://schema.org/closes closes} property is less than the value for the {@link https://schema.org/opens opens} property then the hour range is assumed to span over the next day.
 */
export type OpeningHoursSpecification = OpeningHoursSpecificationLeaf;
interface OpinionNewsArticleLeaf extends NewsArticleBase {
    "@type": "OpinionNewsArticle";
}
/** An {@link https://schema.org/OpinionNewsArticle OpinionNewsArticle} is a {@link https://schema.org/NewsArticle NewsArticle} that primarily expresses opinions rather than journalistic reporting of news and events. For example, a {@link https://schema.org/NewsArticle NewsArticle} consisting of a column or {@link https://schema.org/Blog Blog}/{@link https://schema.org/BlogPosting BlogPosting} entry in the Opinions section of a news publication. */
export type OpinionNewsArticle = OpinionNewsArticleLeaf;
interface OpticianLeaf extends LocalBusinessBase {
    "@type": "Optician";
}
/** A store that sells reading glasses and similar devices for improving vision. */
export type Optician = OpticianLeaf | string;
interface OptometricLeaf extends LocalBusinessBase {
    "@type": "Optometric";
}
/** The science or practice of testing visual acuity and prescribing corrective lenses. */
export type Optometric = OptometricLeaf | string;
interface OrderBase extends ThingBase {
    /** The offer(s) -- e.g., product, quantity and price combinations -- included in the order. */
    "acceptedOffer"?: SchemaValue<Offer | IdReference, "acceptedOffer">;
    /** The billing address for the order. */
    "billingAddress"?: SchemaValue<PostalAddress | IdReference, "billingAddress">;
    /** An entity that arranges for an exchange between a buyer and a seller. In most cases a broker never acquires or releases ownership of a product or service involved in an exchange. If it is not clear whether an entity is a broker, seller, or buyer, the latter two terms are preferred. */
    "broker"?: SchemaValue<Organization | Person | IdReference, "broker">;
    /** A number that confirms the given order or payment has been received. */
    "confirmationNumber"?: SchemaValue<Text, "confirmationNumber">;
    /** Party placing the order or paying the invoice. */
    "customer"?: SchemaValue<Organization | Person | IdReference, "customer">;
    /** Any discount applied (to an Order). */
    "discount"?: SchemaValue<Number | Text, "discount">;
    /** Code used to redeem a discount. */
    "discountCode"?: SchemaValue<Text, "discountCode">;
    /**
     * The currency of the discount.
     *
     * Use standard formats: {@link http://en.wikipedia.org/wiki/ISO_4217 ISO 4217 currency format}, e.g. "USD"; {@link https://en.wikipedia.org/wiki/List_of_cryptocurrencies Ticker symbol} for cryptocurrencies, e.g. "BTC"; well known names for {@link https://en.wikipedia.org/wiki/Local_exchange_trading_system Local Exchange Trading Systems} (LETS) and other currency types, e.g. "Ithaca HOUR".
     */
    "discountCurrency"?: SchemaValue<Text, "discountCurrency">;
    /** Indicates whether the offer was accepted as a gift for someone other than the buyer. */
    "isGift"?: SchemaValue<Boolean, "isGift">;
    /**
     * 'merchant' is an out-dated term for 'seller'.
     *
     * @deprecated Consider using https://schema.org/seller instead.
     */
    "merchant"?: SchemaValue<Organization | Person | IdReference, "merchant">;
    /** Date order was placed. */
    "orderDate"?: SchemaValue<Date | DateTime, "orderDate">;
    /** The delivery of the parcel related to this order or order item. */
    "orderDelivery"?: SchemaValue<ParcelDelivery | IdReference, "orderDelivery">;
    /** The item ordered. */
    "orderedItem"?: SchemaValue<OrderItem | Product | Service | IdReference, "orderedItem">;
    /** The identifier of the transaction. */
    "orderNumber"?: SchemaValue<Text, "orderNumber">;
    /** The current status of the order. */
    "orderStatus"?: SchemaValue<OrderStatus | IdReference, "orderStatus">;
    /** The order is being paid as part of the referenced Invoice. */
    "partOfInvoice"?: SchemaValue<Invoice | IdReference, "partOfInvoice">;
    /**
     * The date that payment is due.
     *
     * @deprecated Consider using https://schema.org/paymentDueDate instead.
     */
    "paymentDue"?: SchemaValue<DateTime, "paymentDue">;
    /** The date that payment is due. */
    "paymentDueDate"?: SchemaValue<Date | DateTime, "paymentDueDate">;
    /** The name of the credit card or other method of payment for the order. */
    "paymentMethod"?: SchemaValue<PaymentMethod | Text | IdReference, "paymentMethod">;
    /** An identifier for the method of payment used (e.g. the last 4 digits of the credit card). */
    "paymentMethodId"?: SchemaValue<Text, "paymentMethodId">;
    /** The URL for sending a payment. */
    "paymentUrl"?: SchemaValue<URL, "paymentUrl">;
    /** An entity which offers (sells / leases / lends / loans) the services / goods. A seller may also be a provider. */
    "seller"?: SchemaValue<Organization | Person | IdReference, "seller">;
}
interface OrderLeaf extends OrderBase {
    "@type": "Order";
}
/** An order is a confirmation of a transaction (a receipt), which can contain multiple line items, each represented by an Offer that has been accepted by the customer. */
export type Order = OrderLeaf;
interface OrderActionBase extends TradeActionBase {
    /** A sub property of instrument. The method of delivery. */
    "deliveryMethod"?: SchemaValue<DeliveryMethod | IdReference, "deliveryMethod">;
}
interface OrderActionLeaf extends OrderActionBase {
    "@type": "OrderAction";
}
/** An agent orders an object/product/service to be delivered/sent. */
export type OrderAction = OrderActionLeaf;
interface OrderItemBase extends ThingBase {
    /** The delivery of the parcel related to this order or order item. */
    "orderDelivery"?: SchemaValue<ParcelDelivery | IdReference, "orderDelivery">;
    /** The item ordered. */
    "orderedItem"?: SchemaValue<OrderItem | Product | Service | IdReference, "orderedItem">;
    /** The identifier of the order item. */
    "orderItemNumber"?: SchemaValue<Text, "orderItemNumber">;
    /** The current status of the order item. */
    "orderItemStatus"?: SchemaValue<OrderStatus | IdReference, "orderItemStatus">;
    /** The number of the item ordered. If the property is not set, assume the quantity is one. */
    "orderQuantity"?: SchemaValue<Number | QuantitativeValue | IdReference, "orderQuantity">;
}
interface OrderItemLeaf extends OrderItemBase {
    "@type": "OrderItem";
}
/** An order item is a line of an order. It includes the quantity and shipping details of a bought offer. */
export type OrderItem = OrderItemLeaf;
interface OrderStatusLeaf extends EnumerationBase {
    "@type": "OrderStatus";
}
/** Enumerated status values for Order. */
export type OrderStatus = "https://schema.org/OrderCancelled" | "OrderCancelled" | "https://schema.org/OrderDelivered" | "OrderDelivered" | "https://schema.org/OrderInTransit" | "OrderInTransit" | "https://schema.org/OrderPaymentDue" | "OrderPaymentDue" | "https://schema.org/OrderPickupAvailable" | "OrderPickupAvailable" | "https://schema.org/OrderProblem" | "OrderProblem" | "https://schema.org/OrderProcessing" | "OrderProcessing" | "https://schema.org/OrderReturned" | "OrderReturned" | OrderStatusLeaf;
interface OrganizationBase extends ThingBase {
    /** The payment method(s) that are accepted in general by an organization, or for some specific demand or offer. */
    "acceptedPaymentMethod"?: SchemaValue<LoanOrCredit | PaymentMethod | Text | IdReference, "acceptedPaymentMethod">;
    /** For a {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization} or other news-related {@link https://schema.org/Organization Organization}, a statement about public engagement activities (for news media, the newsroom’s), including involving the public - digitally or otherwise -- in coverage decisions, reporting and activities after publication. */
    "actionableFeedbackPolicy"?: SchemaValue<CreativeWork | URL | IdReference, "actionableFeedbackPolicy">;
    /** Physical address of the item. */
    "address"?: SchemaValue<PostalAddress | Text | IdReference, "address">;
    /** The number of completed interactions for this entity, in a particular role (the 'agent'), in a particular action (indicated in the statistic), and in a particular context (i.e. interactionService). */
    "agentInteractionStatistic"?: SchemaValue<InteractionCounter | IdReference, "agentInteractionStatistic">;
    /** The overall rating, based on a collection of reviews or ratings, of the item. */
    "aggregateRating"?: SchemaValue<AggregateRating | IdReference, "aggregateRating">;
    /** Alumni of an organization. */
    "alumni"?: SchemaValue<Person | IdReference, "alumni">;
    /** The geographic area where a service or offered item is provided. */
    "areaServed"?: SchemaValue<AdministrativeArea | GeoShape | Place | Text | IdReference, "areaServed">;
    /** An award won by or for this item. */
    "award"?: SchemaValue<Text, "award">;
    /**
     * Awards won by or for this item.
     *
     * @deprecated Consider using https://schema.org/award instead.
     */
    "awards"?: SchemaValue<Text, "awards">;
    /** The brand(s) associated with a product or service, or the brand(s) maintained by an organization or business person. */
    "brand"?: SchemaValue<Brand | Organization | IdReference, "brand">;
    /** A contact point for a person or organization. */
    "contactPoint"?: SchemaValue<ContactPoint | IdReference, "contactPoint">;
    /**
     * A contact point for a person or organization.
     *
     * @deprecated Consider using https://schema.org/contactPoint instead.
     */
    "contactPoints"?: SchemaValue<ContactPoint | IdReference, "contactPoints">;
    /** For an {@link https://schema.org/Organization Organization} (e.g. {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization}), a statement describing (in news media, the newsroom’s) disclosure and correction policy for errors. */
    "correctionsPolicy"?: SchemaValue<CreativeWork | URL | IdReference, "correctionsPolicy">;
    /** A relationship between an organization and a department of that organization, also described as an organization (allowing different urls, logos, opening hours). For example: a store with a pharmacy, or a bakery with a cafe. */
    "department"?: SchemaValue<Organization | IdReference, "department">;
    /** The date that this organization was dissolved. */
    "dissolutionDate"?: SchemaValue<Date, "dissolutionDate">;
    /** Statement on diversity policy by an {@link https://schema.org/Organization Organization} e.g. a {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization}. For a {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization}, a statement describing the newsroom’s diversity policy on both staffing and sources, typically providing staffing data. */
    "diversityPolicy"?: SchemaValue<CreativeWork | URL | IdReference, "diversityPolicy">;
    /** For an {@link https://schema.org/Organization Organization} (often but not necessarily a {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization}), a report on staffing diversity issues. In a news context this might be for example ASNE or RTDNA (US) reports, or self-reported. */
    "diversityStaffingReport"?: SchemaValue<Article | URL | IdReference, "diversityStaffingReport">;
    /** The Dun & Bradstreet DUNS number for identifying an organization or business person. */
    "duns"?: SchemaValue<Text, "duns">;
    /** Email address. */
    "email"?: SchemaValue<Text, "email">;
    /** Someone working for this organization. */
    "employee"?: SchemaValue<Person | IdReference, "employee">;
    /**
     * People working for this organization.
     *
     * @deprecated Consider using https://schema.org/employee instead.
     */
    "employees"?: SchemaValue<Person | IdReference, "employees">;
    /** Statement about ethics policy, e.g. of a {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization} regarding journalistic and publishing practices, or of a {@link https://schema.org/Restaurant Restaurant}, a page describing food source policies. In the case of a {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization}, an ethicsPolicy is typically a statement describing the personal, organizational, and corporate standards of behavior expected by the organization. */
    "ethicsPolicy"?: SchemaValue<CreativeWork | URL | IdReference, "ethicsPolicy">;
    /** Upcoming or past event associated with this place, organization, or action. */
    "event"?: SchemaValue<Event | IdReference, "event">;
    /**
     * Upcoming or past events associated with this place or organization.
     *
     * @deprecated Consider using https://schema.org/event instead.
     */
    "events"?: SchemaValue<Event | IdReference, "events">;
    /** The fax number. */
    "faxNumber"?: SchemaValue<Text, "faxNumber">;
    /** A person or organization who founded this organization. */
    "founder"?: SchemaValue<Organization | Person | IdReference, "founder">;
    /**
     * A person who founded this organization.
     *
     * @deprecated Consider using https://schema.org/founder instead.
     */
    "founders"?: SchemaValue<Person | IdReference, "founders">;
    /** The date that this organization was founded. */
    "foundingDate"?: SchemaValue<Date, "foundingDate">;
    /** The place where the Organization was founded. */
    "foundingLocation"?: SchemaValue<Place | IdReference, "foundingLocation">;
    /** A person or organization that supports (sponsors) something through some kind of financial contribution. */
    "funder"?: SchemaValue<Organization | Person | IdReference, "funder">;
    /** A {@link https://schema.org/Grant Grant} that directly or indirectly provide funding or sponsorship for this item. See also {@link https://schema.org/ownershipFundingInfo ownershipFundingInfo}. */
    "funding"?: SchemaValue<Grant | IdReference, "funding">;
    /** The {@link http://www.gs1.org/gln Global Location Number} (GLN, sometimes also referred to as International Location Number or ILN) of the respective organization, person, or place. The GLN is a 13-digit number used to identify parties and physical locations. */
    "globalLocationNumber"?: SchemaValue<Text, "globalLocationNumber">;
    /** Certification information about a product, organization, service, place, or person. */
    "hasCertification"?: SchemaValue<Certification | IdReference, "hasCertification">;
    /** A credential awarded to the Person or Organization. */
    "hasCredential"?: SchemaValue<EducationalOccupationalCredential | IdReference, "hasCredential">;
    /**
     * The {@link https://www.gs1.org/standards/gs1-digital-link GS1 digital link} associated with the object. This URL should conform to the particular requirements of digital links. The link should only contain the Application Identifiers (AIs) that are relevant for the entity being annotated, for instance a [[Product]] or an [[Organization]], and for the correct granularity. In particular, for products:- A Digital Link that contains a serial number (AI `21`) should only be present on instances of [[IndividualProduct]]
     * - A Digital Link that contains a lot number (AI `10`) should be annotated as [[SomeProduct]] if only products from that lot are sold, or [[IndividualProduct]] if there is only a specific product.
     * - A Digital Link that contains a global model number (AI `8013`) should be attached to a [[Product]] or a [[ProductModel]].
     * Other item types should be adapted similarly.
     */
    "hasGS1DigitalLink"?: SchemaValue<URL, "hasGS1DigitalLink">;
    /** MemberProgram offered by an Organization, for example an eCommerce merchant or an airline. */
    "hasMemberProgram"?: SchemaValue<MemberProgram | IdReference, "hasMemberProgram">;
    /** Specifies a MerchantReturnPolicy that may be applicable. */
    "hasMerchantReturnPolicy"?: SchemaValue<MerchantReturnPolicy | IdReference, "hasMerchantReturnPolicy">;
    /** Indicates an OfferCatalog listing for this Organization, Person, or Service. */
    "hasOfferCatalog"?: SchemaValue<OfferCatalog | IdReference, "hasOfferCatalog">;
    /** Points-of-Sales operated by the organization or person. */
    "hasPOS"?: SchemaValue<Place | IdReference, "hasPOS">;
    /**
     * Indicates a ProductReturnPolicy that may be applicable.
     *
     * @deprecated Consider using https://schema.org/hasMerchantReturnPolicy instead.
     */
    "hasProductReturnPolicy"?: SchemaValue<ProductReturnPolicy | IdReference, "hasProductReturnPolicy">;
    /** The number of interactions for the CreativeWork using the WebSite or SoftwareApplication. The most specific child type of InteractionCounter should be used. */
    "interactionStatistic"?: SchemaValue<InteractionCounter | IdReference, "interactionStatistic">;
    /** The International Standard of Industrial Classification of All Economic Activities (ISIC), Revision 4 code for a particular organization, business person, or place. */
    "isicV4"?: SchemaValue<Text, "isicV4">;
    /** An organization identifier as defined in {@link https://en.wikipedia.org/wiki/ISO/IEC_6523 ISO 6523(-1)}. The identifier should be in the `XXXX:YYYYYY:ZZZ` or `XXXX:YYYYYY`format. Where `XXXX` is a 4 digit _ICD_ (International Code Designator), `YYYYYY` is an _OID_ (Organization Identifier) with all formatting characters (dots, dashes, spaces) removed with a maximal length of 35 characters, and `ZZZ` is an optional OPI (Organization Part Identifier) with a maximum length of 35 characters. The various components (ICD, OID, OPI) are joined with a colon character (ASCII `0x3a`). Note that many existing organization identifiers defined as attributes like {@link https://schema.org/leiCode leiCode} (`0199`), {@link https://schema.org/duns duns} (`0060`) or {@link https://schema.org/globalLocationNumber GLN} (`0088`) can be expressed using ISO-6523. If possible, ISO-6523 codes should be preferred to populating {@link https://schema.org/vatID vatID} or {@link https://schema.org/taxID taxID}, as ISO identifiers are less ambiguous. */
    "iso6523Code"?: SchemaValue<Text, "iso6523Code">;
    /** Keywords or tags used to describe some item. Multiple textual entries in a keywords list are typically delimited by commas, or by repeating the property. */
    "keywords"?: SchemaValue<DefinedTerm | Text | URL | IdReference, "keywords">;
    /** Of a {@link https://schema.org/Person Person}, and less typically of an {@link https://schema.org/Organization Organization}, to indicate a topic that is known about - suggesting possible expertise but not implying it. We do not distinguish skill levels here, or relate this to educational content, events, objectives or {@link https://schema.org/JobPosting JobPosting} descriptions. */
    "knowsAbout"?: SchemaValue<Text | Thing | URL | IdReference, "knowsAbout">;
    /** Of a {@link https://schema.org/Person Person}, and less typically of an {@link https://schema.org/Organization Organization}, to indicate a known language. We do not distinguish skill levels or reading/writing/speaking/signing here. Use language codes from the {@link http://tools.ietf.org/html/bcp47 IETF BCP 47 standard}. */
    "knowsLanguage"?: SchemaValue<Language | Text | IdReference, "knowsLanguage">;
    /** The official name of the organization, e.g. the registered company name. */
    "legalName"?: SchemaValue<Text, "legalName">;
    /** An organization identifier that uniquely identifies a legal entity as defined in ISO 17442. */
    "leiCode"?: SchemaValue<Text, "leiCode">;
    /** The location of, for example, where an event is happening, where an organization is located, or where an action takes place. */
    "location"?: SchemaValue<Place | PostalAddress | Text | VirtualLocation | IdReference, "location">;
    /** An associated logo. */
    "logo"?: SchemaValue<ImageObject | URL | IdReference, "logo">;
    /** A pointer to products or services offered by the organization or person. */
    "makesOffer"?: SchemaValue<Offer | IdReference, "makesOffer">;
    /** A member of an Organization or a ProgramMembership. Organizations can be members of organizations; ProgramMembership is typically for individuals. */
    "member"?: SchemaValue<Organization | Person | IdReference, "member">;
    /** An Organization (or ProgramMembership) to which this Person or Organization belongs. */
    "memberOf"?: SchemaValue<MemberProgramTier | Organization | ProgramMembership | IdReference, "memberOf">;
    /**
     * A member of this organization.
     *
     * @deprecated Consider using https://schema.org/member instead.
     */
    "members"?: SchemaValue<Organization | Person | IdReference, "members">;
    /** The North American Industry Classification System (NAICS) code for a particular organization or business person. */
    "naics"?: SchemaValue<Text, "naics">;
    /** nonprofitStatus indicates the legal status of a non-profit organization in its primary place of business. */
    "nonprofitStatus"?: SchemaValue<NonprofitType | IdReference, "nonprofitStatus">;
    /** The number of employees in an organization, e.g. business. */
    "numberOfEmployees"?: SchemaValue<QuantitativeValue | IdReference, "numberOfEmployees">;
    /** For an {@link https://schema.org/Organization Organization} (often but not necessarily a {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization}), a description of organizational ownership structure; funding and grants. In a news/media setting, this is with particular reference to editorial independence. Note that the {@link https://schema.org/funder funder} is also available and can be used to make basic funder information machine-readable. */
    "ownershipFundingInfo"?: SchemaValue<AboutPage | CreativeWork | Text | URL | IdReference, "ownershipFundingInfo">;
    /** Products owned by the organization or person. */
    "owns"?: SchemaValue<OwnershipInfo | Product | IdReference, "owns">;
    /** The larger organization that this organization is a {@link https://schema.org/subOrganization subOrganization} of, if any. */
    "parentOrganization"?: SchemaValue<Organization | IdReference, "parentOrganization">;
    /**
     * The publishingPrinciples property indicates (typically via {@link https://schema.org/URL URL}) a document describing the editorial principles of an {@link https://schema.org/Organization Organization} (or individual, e.g. a {@link https://schema.org/Person Person} writing a blog) that relate to their activities as a publisher, e.g. ethics or diversity policies. When applied to a {@link https://schema.org/CreativeWork CreativeWork} (e.g. {@link https://schema.org/NewsArticle NewsArticle}) the principles are those of the party primarily responsible for the creation of the {@link https://schema.org/CreativeWork CreativeWork}.
     *
     * While such policies are most typically expressed in natural language, sometimes related information (e.g. indicating a {@link https://schema.org/funder funder}) can be expressed using schema.org terminology.
     */
    "publishingPrinciples"?: SchemaValue<CreativeWork | URL | IdReference, "publishingPrinciples">;
    /** A review of the item. */
    "review"?: SchemaValue<Review | IdReference, "review">;
    /**
     * Review of the item.
     *
     * @deprecated Consider using https://schema.org/review instead.
     */
    "reviews"?: SchemaValue<Review | IdReference, "reviews">;
    /** A pointer to products or services sought by the organization or person (demand). */
    "seeks"?: SchemaValue<Demand | IdReference, "seeks">;
    /**
     * The geographic area where the service is provided.
     *
     * @deprecated Consider using https://schema.org/areaServed instead.
     */
    "serviceArea"?: SchemaValue<AdministrativeArea | GeoShape | Place | IdReference, "serviceArea">;
    /** A statement of knowledge, skill, ability, task or any other assertion expressing a competency that is either claimed by a person, an organization or desired or required to fulfill a role or to work in an occupation. */
    "skills"?: SchemaValue<DefinedTerm | Text | IdReference, "skills">;
    /** A slogan or motto associated with the item. */
    "slogan"?: SchemaValue<Text, "slogan">;
    /** A person or organization that supports a thing through a pledge, promise, or financial contribution. E.g. a sponsor of a Medical Study or a corporate sponsor of an event. */
    "sponsor"?: SchemaValue<Organization | Person | IdReference, "sponsor">;
    /** A relationship between two organizations where the first includes the second, e.g., as a subsidiary. See also: the more specific 'department' property. */
    "subOrganization"?: SchemaValue<Organization | IdReference, "subOrganization">;
    /** The Tax / Fiscal ID of the organization or person, e.g. the TIN in the US or the CIF/NIF in Spain. */
    "taxID"?: SchemaValue<Text, "taxID">;
    /** The telephone number. */
    "telephone"?: SchemaValue<Text, "telephone">;
    /** For an {@link https://schema.org/Organization Organization} (typically a {@link https://schema.org/NewsMediaOrganization NewsMediaOrganization}), a statement about policy on use of unnamed sources and the decision process required. */
    "unnamedSourcesPolicy"?: SchemaValue<CreativeWork | URL | IdReference, "unnamedSourcesPolicy">;
    /** The Value-added Tax ID of the organization or person. */
    "vatID"?: SchemaValue<Text, "vatID">;
}
interface OrganizationLeaf extends OrganizationBase {
    "@type": "Organization";
}
/** An organization such as a school, NGO, corporation, club, etc. */
export type Organization = OrganizationLeaf | Airline | Consortium | Corporation | EducationalOrganization | FundingScheme | GovernmentOrganization | LibrarySystem | LocalBusiness | MedicalOrganization | NewsMediaOrganization | NGO | OnlineBusiness | PerformingGroup | PoliticalParty | Project | ResearchOrganization | SearchRescueOrganization | SportsOrganization | WorkersUnion | string;
interface OrganizeActionLeaf extends ActionBase {
    "@type": "OrganizeAction";
}
/** The act of manipulating/administering/supervising/controlling one or more objects. */
export type OrganizeAction = OrganizeActionLeaf | AllocateAction | ApplyAction | BookmarkAction | PlanAction;
interface OtolaryngologicLeaf extends LocalBusinessBase {
    "@type": "Otolaryngologic";
}
/** A specific branch of medical science that is concerned with the ear, nose and throat and their respective disease states. */
export type Otolaryngologic = OtolaryngologicLeaf | string;
interface OutletStoreLeaf extends LocalBusinessBase {
    "@type": "OutletStore";
}
/** An outlet store. */
export type OutletStore = OutletStoreLeaf | string;
interface OwnershipInfoBase extends ThingBase {
    /** The organization or person from which the product was acquired. */
    "acquiredFrom"?: SchemaValue<Organization | Person | IdReference, "acquiredFrom">;
    /** The date and time of obtaining the product. */
    "ownedFrom"?: SchemaValue<DateTime, "ownedFrom">;
    /** The date and time of giving up ownership on the product. */
    "ownedThrough"?: SchemaValue<DateTime, "ownedThrough">;
    /** The product that this structured value is referring to. */
    "typeOfGood"?: SchemaValue<Product | Service | IdReference, "typeOfGood">;
}
interface OwnershipInfoLeaf extends OwnershipInfoBase {
    "@type": "OwnershipInfo";
}
/** A structured value providing information about when a certain organization or person owned a certain product. */
export type OwnershipInfo = OwnershipInfoLeaf;
interface PaintActionLeaf extends ActionBase {
    "@type": "PaintAction";
}
/** The act of producing a painting, typically with paint and canvas as instruments. */
export type PaintAction = PaintActionLeaf;
interface PaintingLeaf extends CreativeWorkBase {
    "@type": "Painting";
}
/** A painting. */
export type Painting = PaintingLeaf;
interface PalliativeProcedureBase extends MedicalProcedureBase, MedicalTherapyBase {
}
interface PalliativeProcedureLeaf extends PalliativeProcedureBase {
    "@type": "PalliativeProcedure";
}
/** A medical procedure intended primarily for palliative purposes, aimed at relieving the symptoms of an underlying health condition. */
export type PalliativeProcedure = PalliativeProcedureLeaf;
interface ParcelDeliveryBase extends ThingBase {
    /**
     * 'carrier' is an out-dated term indicating the 'provider' for parcel delivery and flights.
     *
     * @deprecated Consider using https://schema.org/provider instead.
     */
    "carrier"?: SchemaValue<Organization | IdReference, "carrier">;
    /** Destination address. */
    "deliveryAddress"?: SchemaValue<PostalAddress | IdReference, "deliveryAddress">;
    /** New entry added as the package passes through each leg of its journey (from shipment to final delivery). */
    "deliveryStatus"?: SchemaValue<DeliveryEvent | IdReference, "deliveryStatus">;
    /** The earliest date the package may arrive. */
    "expectedArrivalFrom"?: SchemaValue<Date | DateTime, "expectedArrivalFrom">;
    /** The latest date the package may arrive. */
    "expectedArrivalUntil"?: SchemaValue<Date | DateTime, "expectedArrivalUntil">;
    /** Method used for delivery or shipping. */
    "hasDeliveryMethod"?: SchemaValue<DeliveryMethod | IdReference, "hasDeliveryMethod">;
    /** Item(s) being shipped. */
    "itemShipped"?: SchemaValue<Product | IdReference, "itemShipped">;
    /** Shipper's address. */
    "originAddress"?: SchemaValue<PostalAddress | IdReference, "originAddress">;
    /** The overall order the items in this delivery were included in. */
    "partOfOrder"?: SchemaValue<Order | IdReference, "partOfOrder">;
    /** The service provider, service operator, or service performer; the goods producer. Another party (a seller) may offer those services or goods on behalf of the provider. A provider may also serve as the seller. */
    "provider"?: SchemaValue<Organization | Person | IdReference, "provider">;
    /** Shipper tracking number. */
    "trackingNumber"?: SchemaValue<Text, "trackingNumber">;
    /** Tracking url for the parcel delivery. */
    "trackingUrl"?: SchemaValue<URL, "trackingUrl">;
}
interface ParcelDeliveryLeaf extends ParcelDeliveryBase {
    "@type": "ParcelDelivery";
}
/** The delivery of a parcel either via the postal service or a commercial service. */
export type ParcelDelivery = ParcelDeliveryLeaf;
interface ParentAudienceBase extends PeopleAudienceBase {
    /** Maximal age of the child. */
    "childMaxAge"?: SchemaValue<Number, "childMaxAge">;
    /** Minimal age of the child. */
    "childMinAge"?: SchemaValue<Number, "childMinAge">;
}
interface ParentAudienceLeaf extends ParentAudienceBase {
    "@type": "ParentAudience";
}
/** A set of characteristics describing parents, who can be interested in viewing some content. */
export type ParentAudience = ParentAudienceLeaf;
interface ParkLeaf extends CivicStructureBase {
    "@type": "Park";
}
/** A park. */
export type Park = ParkLeaf | string;
interface ParkingFacilityLeaf extends CivicStructureBase {
    "@type": "ParkingFacility";
}
/** A parking lot or other parking facility. */
export type ParkingFacility = ParkingFacilityLeaf | string;
interface PathologyTestBase extends MedicalTestBase {
    /** The type of tissue sample required for the test. */
    "tissueSample"?: SchemaValue<Text, "tissueSample">;
}
interface PathologyTestLeaf extends PathologyTestBase {
    "@type": "PathologyTest";
}
/** A medical test performed by a laboratory that typically involves examination of a tissue sample by a pathologist. */
export type PathologyTest = PathologyTestLeaf;
interface PatientBase extends PersonBase, MedicalAudienceBase {
    /** One or more alternative conditions considered in the differential diagnosis process as output of a diagnosis process. */
    "diagnosis"?: SchemaValue<MedicalCondition | IdReference, "diagnosis">;
    /** Specifying a drug or medicine used in a medication procedure. */
    "drug"?: SchemaValue<Drug | IdReference, "drug">;
    /** Specifying the health condition(s) of a patient, medical study, or other target audience. */
    "healthCondition"?: SchemaValue<MedicalCondition | IdReference, "healthCondition">;
}
interface PatientLeaf extends PatientBase {
    "@type": "Patient";
}
/** A patient is any person recipient of health care services. */
export type Patient = PatientLeaf | string;
interface PawnShopLeaf extends LocalBusinessBase {
    "@type": "PawnShop";
}
/** A shop that will buy, or lend money against the security of, personal possessions. */
export type PawnShop = PawnShopLeaf | string;
interface PayActionBase extends TradeActionBase {
    /** A sub property of participant. The participant who is at the receiving end of the action. */
    "recipient"?: SchemaValue<Audience | ContactPoint | Organization | Person | IdReference, "recipient">;
}
interface PayActionLeaf extends PayActionBase {
    "@type": "PayAction";
}
/** An agent pays a price to a participant. */
export type PayAction = PayActionLeaf;
interface PaymentCardBase extends FinancialProductBase, PaymentMethodBase {
    /** A cardholder benefit that pays the cardholder a small percentage of their net expenditures. */
    "cashBack"?: SchemaValue<Boolean | Number, "cashBack">;
    /** A secure method for consumers to purchase products or services via debit, credit or smartcards by using RFID or NFC technology. */
    "contactlessPayment"?: SchemaValue<Boolean, "contactlessPayment">;
    /** A floor limit is the amount of money above which credit card transactions must be authorized. */
    "floorLimit"?: SchemaValue<MonetaryAmount | IdReference, "floorLimit">;
    /** The minimum payment is the lowest amount of money that one is required to pay on a credit card statement each month. */
    "monthlyMinimumRepaymentAmount"?: SchemaValue<MonetaryAmount | Number | IdReference, "monthlyMinimumRepaymentAmount">;
}
interface PaymentCardLeaf extends PaymentCardBase {
    "@type": "PaymentCard";
}
/** A payment method using a credit, debit, store or other card to associate the payment with an account. */
export type PaymentCard = PaymentCardLeaf | CreditCard;
interface PaymentChargeSpecificationBase extends PriceSpecificationBase {
    /** The delivery method(s) to which the delivery charge or payment charge specification applies. */
    "appliesToDeliveryMethod"?: SchemaValue<DeliveryMethod | IdReference, "appliesToDeliveryMethod">;
    /** The payment method(s) to which the payment charge specification applies. */
    "appliesToPaymentMethod"?: SchemaValue<PaymentMethod | IdReference, "appliesToPaymentMethod">;
}
interface PaymentChargeSpecificationLeaf extends PaymentChargeSpecificationBase {
    "@type": "PaymentChargeSpecification";
}
/** The costs of settling the payment using a particular payment method. */
export type PaymentChargeSpecification = PaymentChargeSpecificationLeaf;
interface PaymentMethodBase extends ThingBase {
    /** The type of a payment method. */
    "paymentMethodType"?: SchemaValue<PaymentMethodType | IdReference, "paymentMethodType">;
}
interface PaymentMethodLeaf extends PaymentMethodBase {
    "@type": "PaymentMethod";
}
/**
 * A payment method is a standardized procedure for transferring the monetary amount for a purchase. Payment methods are characterized by the legal and technical structures used, and by the organization or group carrying out the transaction. The following legacy values should be accepted:
 * - http://purl.org/goodrelations/v1#ByBankTransferInAdvance
 * - http://purl.org/goodrelations/v1#ByInvoice
 * - http://purl.org/goodrelations/v1#Cash
 * - http://purl.org/goodrelations/v1#CheckInAdvance
 * - http://purl.org/goodrelations/v1#COD
 * - http://purl.org/goodrelations/v1#DirectDebit
 * - http://purl.org/goodrelations/v1#GoogleCheckout
 * - http://purl.org/goodrelations/v1#PayPal
 * - http://purl.org/goodrelations/v1#PaySwarm
 *
 * Structured values are recommended for newer payment methods.
 */
export type PaymentMethod = PaymentMethodLeaf | PaymentCard | PaymentService;
interface PaymentMethodTypeLeaf extends EnumerationBase {
    "@type": "PaymentMethodType";
}
/** The type of payment method, only for generic payment types, specific forms of payments, like card payment should be expressed using subclasses of PaymentMethod. */
export type PaymentMethodType = "https://schema.org/ByBankTransferInAdvance" | "ByBankTransferInAdvance" | "https://schema.org/ByInvoice" | "ByInvoice" | "https://schema.org/Cash" | "Cash" | "https://schema.org/CheckInAdvance" | "CheckInAdvance" | "https://schema.org/COD" | "COD" | "https://schema.org/DirectDebit" | "DirectDebit" | "https://schema.org/InStorePrepay" | "InStorePrepay" | "https://schema.org/PhoneCarrierPayment" | "PhoneCarrierPayment" | PaymentMethodTypeLeaf;
interface PaymentServiceBase extends FinancialProductBase, PaymentMethodBase {
}
interface PaymentServiceLeaf extends PaymentServiceBase {
    "@type": "PaymentService";
}
/** A Service to transfer funds from a person or organization to a beneficiary person or organization. */
export type PaymentService = PaymentServiceLeaf;
interface PaymentStatusTypeLeaf extends EnumerationBase {
    "@type": "PaymentStatusType";
}
/** A specific payment status. For example, PaymentDue, PaymentComplete, etc. */
export type PaymentStatusType = "https://schema.org/PaymentAutomaticallyApplied" | "PaymentAutomaticallyApplied" | "https://schema.org/PaymentComplete" | "PaymentComplete" | "https://schema.org/PaymentDeclined" | "PaymentDeclined" | "https://schema.org/PaymentDue" | "PaymentDue" | "https://schema.org/PaymentPastDue" | "PaymentPastDue" | PaymentStatusTypeLeaf;
interface PediatricLeaf extends LocalBusinessBase {
    "@type": "Pediatric";
}
/** A specific branch of medical science that specializes in the care of infants, children and adolescents. */
export type Pediatric = PediatricLeaf | string;
interface PeopleAudienceBase extends AudienceBase {
    /** Specifying the health condition(s) of a patient, medical study, or other target audience. */
    "healthCondition"?: SchemaValue<MedicalCondition | IdReference, "healthCondition">;
    /** Audiences defined by a person's gender. */
    "requiredGender"?: SchemaValue<Text, "requiredGender">;
    /** Audiences defined by a person's maximum age. */
    "requiredMaxAge"?: SchemaValue<Integer, "requiredMaxAge">;
    /** Audiences defined by a person's minimum age. */
    "requiredMinAge"?: SchemaValue<Integer, "requiredMinAge">;
    /** The age or age range for the intended audience or person, for example 3-12 months for infants, 1-5 years for toddlers. */
    "suggestedAge"?: SchemaValue<QuantitativeValue | IdReference, "suggestedAge">;
    /** The suggested gender of the intended person or audience, for example "male", "female", or "unisex". */
    "suggestedGender"?: SchemaValue<GenderType | Text | IdReference, "suggestedGender">;
    /** Maximum recommended age in years for the audience or user. */
    "suggestedMaxAge"?: SchemaValue<Number, "suggestedMaxAge">;
    /** A suggested range of body measurements for the intended audience or person, for example inseam between 32 and 34 inches or height between 170 and 190 cm. Typically found on a size chart for wearable products. */
    "suggestedMeasurement"?: SchemaValue<QuantitativeValue | IdReference, "suggestedMeasurement">;
    /** Minimum recommended age in years for the audience or user. */
    "suggestedMinAge"?: SchemaValue<Number, "suggestedMinAge">;
}
interface PeopleAudienceLeaf extends PeopleAudienceBase {
    "@type": "PeopleAudience";
}
/** A set of characteristics belonging to people, e.g. who compose an item's target audience. */
export type PeopleAudience = PeopleAudienceLeaf | MedicalAudience | ParentAudience;
interface PerformActionBase extends PlayActionBase {
    /** A sub property of location. The entertainment business where the action occurred. */
    "entertainmentBusiness"?: SchemaValue<EntertainmentBusiness | IdReference, "entertainmentBusiness">;
}
interface PerformActionLeaf extends PerformActionBase {
    "@type": "PerformAction";
}
/** The act of participating in performance arts. */
export type PerformAction = PerformActionLeaf;
interface PerformingArtsTheaterLeaf extends CivicStructureBase {
    "@type": "PerformingArtsTheater";
}
/** A theater or other performing art center. */
export type PerformingArtsTheater = PerformingArtsTheaterLeaf | string;
interface PerformingGroupLeaf extends OrganizationBase {
    "@type": "PerformingGroup";
}
/** A performance group, such as a band, an orchestra, or a circus. */
export type PerformingGroup = PerformingGroupLeaf | DanceGroup | MusicGroup | TheaterGroup | string;
interface PeriodicalLeaf extends CreativeWorkSeriesBase {
    "@type": "Periodical";
}
/**
 * A publication in any medium issued in successive parts bearing numerical or chronological designations and intended to continue indefinitely, such as a magazine, scholarly journal, or newspaper.
 *
 * See also {@link http://blog.schema.org/2014/09/schemaorg-support-for-bibliographic_2.html blog post}.
 */
export type Periodical = PeriodicalLeaf | ComicSeries | Newspaper;
interface PermitBase extends ThingBase {
    /** The organization issuing the item, for example a {@link https://schema.org/Permit Permit}, {@link https://schema.org/Ticket Ticket}, or {@link https://schema.org/Certification Certification}. */
    "issuedBy"?: SchemaValue<Organization | IdReference, "issuedBy">;
    /** The service through which the permit was granted. */
    "issuedThrough"?: SchemaValue<Service | IdReference, "issuedThrough">;
    /** The target audience for this permit. */
    "permitAudience"?: SchemaValue<Audience | IdReference, "permitAudience">;
    /** The duration of validity of a permit or similar thing. */
    "validFor"?: SchemaValue<Duration | IdReference, "validFor">;
    /** The date when the item becomes valid. */
    "validFrom"?: SchemaValue<Date | DateTime, "validFrom">;
    /** The geographic area where the item is valid. Applies for example to a {@link https://schema.org/Permit Permit}, a {@link https://schema.org/Certification Certification}, or an {@link https://schema.org/EducationalOccupationalCredential EducationalOccupationalCredential}. */
    "validIn"?: SchemaValue<AdministrativeArea | IdReference, "validIn">;
    /** The date when the item is no longer valid. */
    "validUntil"?: SchemaValue<Date, "validUntil">;
}
interface PermitLeaf extends PermitBase {
    "@type": "Permit";
}
/** A permit issued by an organization, e.g. a parking pass. */
export type Permit = PermitLeaf | GovernmentPermit;
interface PersonBase extends ThingBase {
    /** An additional name for a Person, can be used for a middle name. */
    "additionalName"?: SchemaValue<Text, "additionalName">;
    /** Physical address of the item. */
    "address"?: SchemaValue<PostalAddress | Text | IdReference, "address">;
    /** An organization that this person is affiliated with. For example, a school/university, a club, or a team. */
    "affiliation"?: SchemaValue<Organization | IdReference, "affiliation">;
    /** The number of completed interactions for this entity, in a particular role (the 'agent'), in a particular action (indicated in the statistic), and in a particular context (i.e. interactionService). */
    "agentInteractionStatistic"?: SchemaValue<InteractionCounter | IdReference, "agentInteractionStatistic">;
    /** An organization that the person is an alumni of. */
    "alumniOf"?: SchemaValue<EducationalOrganization | Organization | IdReference, "alumniOf">;
    /** An award won by or for this item. */
    "award"?: SchemaValue<Text, "award">;
    /**
     * Awards won by or for this item.
     *
     * @deprecated Consider using https://schema.org/award instead.
     */
    "awards"?: SchemaValue<Text, "awards">;
    /** Date of birth. */
    "birthDate"?: SchemaValue<Date, "birthDate">;
    /** The place where the person was born. */
    "birthPlace"?: SchemaValue<Place | IdReference, "birthPlace">;
    /** The brand(s) associated with a product or service, or the brand(s) maintained by an organization or business person. */
    "brand"?: SchemaValue<Brand | Organization | IdReference, "brand">;
    /** A {@link https://en.wikipedia.org/wiki/Call_sign callsign}, as used in broadcasting and radio communications to identify people, radio and TV stations, or vehicles. */
    "callSign"?: SchemaValue<Text, "callSign">;
    /** A child of the person. */
    "children"?: SchemaValue<Person | IdReference, "children">;
    /** A colleague of the person. */
    "colleague"?: SchemaValue<Person | URL | IdReference, "colleague">;
    /**
     * A colleague of the person.
     *
     * @deprecated Consider using https://schema.org/colleague instead.
     */
    "colleagues"?: SchemaValue<Person | IdReference, "colleagues">;
    /** A contact point for a person or organization. */
    "contactPoint"?: SchemaValue<ContactPoint | IdReference, "contactPoint">;
    /**
     * A contact point for a person or organization.
     *
     * @deprecated Consider using https://schema.org/contactPoint instead.
     */
    "contactPoints"?: SchemaValue<ContactPoint | IdReference, "contactPoints">;
    /** Date of death. */
    "deathDate"?: SchemaValue<Date, "deathDate">;
    /** The place where the person died. */
    "deathPlace"?: SchemaValue<Place | IdReference, "deathPlace">;
    /** The Dun & Bradstreet DUNS number for identifying an organization or business person. */
    "duns"?: SchemaValue<Text, "duns">;
    /** Email address. */
    "email"?: SchemaValue<Text, "email">;
    /** Family name. In the U.S., the last name of a Person. */
    "familyName"?: SchemaValue<Text, "familyName">;
    /** The fax number. */
    "faxNumber"?: SchemaValue<Text, "faxNumber">;
    /** The most generic uni-directional social relation. */
    "follows"?: SchemaValue<Person | IdReference, "follows">;
    /** A person or organization that supports (sponsors) something through some kind of financial contribution. */
    "funder"?: SchemaValue<Organization | Person | IdReference, "funder">;
    /** A {@link https://schema.org/Grant Grant} that directly or indirectly provide funding or sponsorship for this item. See also {@link https://schema.org/ownershipFundingInfo ownershipFundingInfo}. */
    "funding"?: SchemaValue<Grant | IdReference, "funding">;
    /** Gender of something, typically a {@link https://schema.org/Person Person}, but possibly also fictional characters, animals, etc. While https://schema.org/Male and https://schema.org/Female may be used, text strings are also acceptable for people who do not identify as a binary gender. The {@link https://schema.org/gender gender} property can also be used in an extended sense to cover e.g. the gender of sports teams. As with the gender of individuals, we do not try to enumerate all possibilities. A mixed-gender {@link https://schema.org/SportsTeam SportsTeam} can be indicated with a text value of "Mixed". */
    "gender"?: SchemaValue<GenderType | Text | IdReference, "gender">;
    /** Given name. In the U.S., the first name of a Person. */
    "givenName"?: SchemaValue<Text, "givenName">;
    /** The {@link http://www.gs1.org/gln Global Location Number} (GLN, sometimes also referred to as International Location Number or ILN) of the respective organization, person, or place. The GLN is a 13-digit number used to identify parties and physical locations. */
    "globalLocationNumber"?: SchemaValue<Text, "globalLocationNumber">;
    /** Certification information about a product, organization, service, place, or person. */
    "hasCertification"?: SchemaValue<Certification | IdReference, "hasCertification">;
    /** A credential awarded to the Person or Organization. */
    "hasCredential"?: SchemaValue<EducationalOccupationalCredential | IdReference, "hasCredential">;
    /** The Person's occupation. For past professions, use Role for expressing dates. */
    "hasOccupation"?: SchemaValue<Occupation | IdReference, "hasOccupation">;
    /** Indicates an OfferCatalog listing for this Organization, Person, or Service. */
    "hasOfferCatalog"?: SchemaValue<OfferCatalog | IdReference, "hasOfferCatalog">;
    /** Points-of-Sales operated by the organization or person. */
    "hasPOS"?: SchemaValue<Place | IdReference, "hasPOS">;
    /** The height of the item. */
    "height"?: SchemaValue<Distance | QuantitativeValue | IdReference, "height">;
    /** A contact location for a person's residence. */
    "homeLocation"?: SchemaValue<ContactPoint | Place | IdReference, "homeLocation">;
    /** An honorific prefix preceding a Person's name such as Dr/Mrs/Mr. */
    "honorificPrefix"?: SchemaValue<Text, "honorificPrefix">;
    /** An honorific suffix following a Person's name such as M.D./PhD/MSCSW. */
    "honorificSuffix"?: SchemaValue<Text, "honorificSuffix">;
    /** The number of interactions for the CreativeWork using the WebSite or SoftwareApplication. The most specific child type of InteractionCounter should be used. */
    "interactionStatistic"?: SchemaValue<InteractionCounter | IdReference, "interactionStatistic">;
    /** The International Standard of Industrial Classification of All Economic Activities (ISIC), Revision 4 code for a particular organization, business person, or place. */
    "isicV4"?: SchemaValue<Text, "isicV4">;
    /** The job title of the person (for example, Financial Manager). */
    "jobTitle"?: SchemaValue<DefinedTerm | Text | IdReference, "jobTitle">;
    /** The most generic bi-directional social/work relation. */
    "knows"?: SchemaValue<Person | IdReference, "knows">;
    /** Of a {@link https://schema.org/Person Person}, and less typically of an {@link https://schema.org/Organization Organization}, to indicate a topic that is known about - suggesting possible expertise but not implying it. We do not distinguish skill levels here, or relate this to educational content, events, objectives or {@link https://schema.org/JobPosting JobPosting} descriptions. */
    "knowsAbout"?: SchemaValue<Text | Thing | URL | IdReference, "knowsAbout">;
    /** Of a {@link https://schema.org/Person Person}, and less typically of an {@link https://schema.org/Organization Organization}, to indicate a known language. We do not distinguish skill levels or reading/writing/speaking/signing here. Use language codes from the {@link http://tools.ietf.org/html/bcp47 IETF BCP 47 standard}. */
    "knowsLanguage"?: SchemaValue<Language | Text | IdReference, "knowsLanguage">;
    /** A pointer to products or services offered by the organization or person. */
    "makesOffer"?: SchemaValue<Offer | IdReference, "makesOffer">;
    /** An Organization (or ProgramMembership) to which this Person or Organization belongs. */
    "memberOf"?: SchemaValue<MemberProgramTier | Organization | ProgramMembership | IdReference, "memberOf">;
    /** The North American Industry Classification System (NAICS) code for a particular organization or business person. */
    "naics"?: SchemaValue<Text, "naics">;
    /** Nationality of the person. */
    "nationality"?: SchemaValue<Country | IdReference, "nationality">;
    /** The total financial value of the person as calculated by subtracting assets from liabilities. */
    "netWorth"?: SchemaValue<MonetaryAmount | PriceSpecification | IdReference, "netWorth">;
    /** Products owned by the organization or person. */
    "owns"?: SchemaValue<OwnershipInfo | Product | IdReference, "owns">;
    /** A parent of this person. */
    "parent"?: SchemaValue<Person | IdReference, "parent">;
    /**
     * A parents of the person.
     *
     * @deprecated Consider using https://schema.org/parent instead.
     */
    "parents"?: SchemaValue<Person | IdReference, "parents">;
    /** Event that this person is a performer or participant in. */
    "performerIn"?: SchemaValue<Event | IdReference, "performerIn">;
    /**
     * The publishingPrinciples property indicates (typically via {@link https://schema.org/URL URL}) a document describing the editorial principles of an {@link https://schema.org/Organization Organization} (or individual, e.g. a {@link https://schema.org/Person Person} writing a blog) that relate to their activities as a publisher, e.g. ethics or diversity policies. When applied to a {@link https://schema.org/CreativeWork CreativeWork} (e.g. {@link https://schema.org/NewsArticle NewsArticle}) the principles are those of the party primarily responsible for the creation of the {@link https://schema.org/CreativeWork CreativeWork}.
     *
     * While such policies are most typically expressed in natural language, sometimes related information (e.g. indicating a {@link https://schema.org/funder funder}) can be expressed using schema.org terminology.
     */
    "publishingPrinciples"?: SchemaValue<CreativeWork | URL | IdReference, "publishingPrinciples">;
    /** The most generic familial relation. */
    "relatedTo"?: SchemaValue<Person | IdReference, "relatedTo">;
    /** A pointer to products or services sought by the organization or person (demand). */
    "seeks"?: SchemaValue<Demand | IdReference, "seeks">;
    /** A sibling of the person. */
    "sibling"?: SchemaValue<Person | IdReference, "sibling">;
    /**
     * A sibling of the person.
     *
     * @deprecated Consider using https://schema.org/sibling instead.
     */
    "siblings"?: SchemaValue<Person | IdReference, "siblings">;
    /** A statement of knowledge, skill, ability, task or any other assertion expressing a competency that is either claimed by a person, an organization or desired or required to fulfill a role or to work in an occupation. */
    "skills"?: SchemaValue<DefinedTerm | Text | IdReference, "skills">;
    /** A person or organization that supports a thing through a pledge, promise, or financial contribution. E.g. a sponsor of a Medical Study or a corporate sponsor of an event. */
    "sponsor"?: SchemaValue<Organization | Person | IdReference, "sponsor">;
    /** The person's spouse. */
    "spouse"?: SchemaValue<Person | IdReference, "spouse">;
    /** The Tax / Fiscal ID of the organization or person, e.g. the TIN in the US or the CIF/NIF in Spain. */
    "taxID"?: SchemaValue<Text, "taxID">;
    /** The telephone number. */
    "telephone"?: SchemaValue<Text, "telephone">;
    /** The Value-added Tax ID of the organization or person. */
    "vatID"?: SchemaValue<Text, "vatID">;
    /** The weight of the product or person. */
    "weight"?: SchemaValue<QuantitativeValue | IdReference, "weight">;
    /** A contact location for a person's place of work. */
    "workLocation"?: SchemaValue<ContactPoint | Place | IdReference, "workLocation">;
    /** Organizations that the person works for. */
    "worksFor"?: SchemaValue<Organization | IdReference, "worksFor">;
}
interface PersonLeaf extends PersonBase {
    "@type": "Person";
}
/** A person (alive, dead, undead, or fictional). */
export type Person = PersonLeaf | Patient | string;
interface PetStoreLeaf extends LocalBusinessBase {
    "@type": "PetStore";
}
/** A pet store. */
export type PetStore = PetStoreLeaf | string;
interface PharmacyBase extends LocalBusinessBase, MedicalOrganizationBase {
}
interface PharmacyLeaf extends PharmacyBase {
    "@type": "Pharmacy";
}
/** A pharmacy or drugstore. */
export type Pharmacy = PharmacyLeaf | string;
interface PhotographLeaf extends CreativeWorkBase {
    "@type": "Photograph";
}
/** A photograph. */
export type Photograph = PhotographLeaf;
interface PhotographActionLeaf extends ActionBase {
    "@type": "PhotographAction";
}
/** The act of capturing still images of objects using a camera. */
export type PhotographAction = PhotographActionLeaf;
interface PhysicalActivityBase extends MedicalEntityBase {
    /** The anatomy of the underlying organ system or structures associated with this entity. */
    "associatedAnatomy"?: SchemaValue<AnatomicalStructure | AnatomicalSystem | SuperficialAnatomy | IdReference, "associatedAnatomy">;
    /** A category for the item. Greater signs or slashes can be used to informally indicate a category hierarchy. */
    "category"?: SchemaValue<CategoryCode | PhysicalActivityCategory | Text | Thing | URL | IdReference, "category">;
    /** The characteristics of associated patients, such as age, gender, race etc. */
    "epidemiology"?: SchemaValue<Text, "epidemiology">;
    /** Changes in the normal mechanical, physical, and biochemical functions that are associated with this activity or condition. */
    "pathophysiology"?: SchemaValue<Text, "pathophysiology">;
}
interface PhysicalActivityLeaf extends PhysicalActivityBase {
    "@type": "PhysicalActivity";
}
/** Any bodily activity that enhances or maintains physical fitness and overall health and wellness. Includes activity that is part of daily living and routine, structured exercise, and exercise prescribed as part of a medical treatment or recovery plan. */
export type PhysicalActivity = PhysicalActivityLeaf | ExercisePlan;
interface PhysicalActivityCategoryLeaf extends EnumerationBase {
    "@type": "PhysicalActivityCategory";
}
/** Categories of physical activity, organized by physiologic classification. */
export type PhysicalActivityCategory = "https://schema.org/AerobicActivity" | "AerobicActivity" | "https://schema.org/AnaerobicActivity" | "AnaerobicActivity" | "https://schema.org/Balance" | "Balance" | "https://schema.org/Flexibility" | "Flexibility" | "https://schema.org/LeisureTimeActivity" | "LeisureTimeActivity" | "https://schema.org/OccupationalActivity" | "OccupationalActivity" | "https://schema.org/StrengthTraining" | "StrengthTraining" | PhysicalActivityCategoryLeaf;
interface PhysicalExamBase extends MedicalProcedureBase, EnumerationBase {
}
interface PhysicalExamLeaf extends PhysicalExamBase {
    "@type": "PhysicalExam";
}
/** A type of physical examination of a patient performed by a physician. */
export type PhysicalExam = "https://schema.org/Abdomen" | "Abdomen" | "https://schema.org/Appearance" | "Appearance" | "https://schema.org/CardiovascularExam" | "CardiovascularExam" | "https://schema.org/Ear" | "Ear" | "https://schema.org/Eye" | "Eye" | "https://schema.org/Genitourinary" | "Genitourinary" | "https://schema.org/Head" | "Head" | "https://schema.org/Lung" | "Lung" | "https://schema.org/MusculoskeletalExam" | "MusculoskeletalExam" | "https://schema.org/Neck" | "Neck" | "https://schema.org/Neuro" | "Neuro" | "https://schema.org/Nose" | "Nose" | "https://schema.org/Skin" | "Skin" | "https://schema.org/Throat" | "Throat" | PhysicalExamLeaf;
interface PhysicalTherapyLeaf extends MedicalTherapyBase {
    "@type": "PhysicalTherapy";
}
/** A process of progressive physical care and rehabilitation aimed at improving a health condition. */
export type PhysicalTherapy = PhysicalTherapyLeaf;
interface PhysicianBase extends LocalBusinessBase, MedicalOrganizationBase {
    /** A medical service available from this provider. */
    "availableService"?: SchemaValue<MedicalProcedure | MedicalTest | MedicalTherapy | IdReference, "availableService">;
    /** A hospital with which the physician or office is affiliated. */
    "hospitalAffiliation"?: SchemaValue<Hospital | IdReference, "hospitalAffiliation">;
    /** A medical specialty of the provider. */
    "medicalSpecialty"?: SchemaValue<MedicalSpecialty | IdReference, "medicalSpecialty">;
    /**
     * A category describing the job, preferably using a term from a taxonomy such as {@link http://www.onetcenter.org/taxonomy.html BLS O*NET-SOC}, {@link https://www.ilo.org/public/english/bureau/stat/isco/isco08/ ISCO-08} or similar, with the property repeated for each applicable value. Ideally the taxonomy should be identified, and both the textual label and formal code for the category should be provided.
     *
     * Note: for historical reasons, any textual label and formal code provided as a literal may be assumed to be from O*NET-SOC.
     */
    "occupationalCategory"?: SchemaValue<CategoryCode | Text | IdReference, "occupationalCategory">;
    /** A {@link https://en.wikipedia.org/wiki/National_Provider_Identifier National Provider Identifier} (NPI) is a unique 10-digit identification number issued to health care providers in the United States by the Centers for Medicare and Medicaid Services. */
    "usNPI"?: SchemaValue<Text, "usNPI">;
}
interface PhysicianLeaf extends PhysicianBase {
    "@type": "Physician";
}
/** An individual physician or a physician's office considered as a {@link https://schema.org/MedicalOrganization MedicalOrganization}. */
export type Physician = PhysicianLeaf | IndividualPhysician | PhysiciansOffice | string;
interface PhysiciansOfficeLeaf extends PhysicianBase {
    "@type": "PhysiciansOffice";
}
/** A doctor's office or clinic. */
export type PhysiciansOffice = PhysiciansOfficeLeaf | string;
interface PhysiotherapyLeaf extends LocalBusinessBase {
    "@type": "Physiotherapy";
}
/** The practice of treatment of disease, injury, or deformity by physical methods such as massage, heat treatment, and exercise rather than by drugs or surgery. */
export type Physiotherapy = PhysiotherapyLeaf | string;
interface PlaceBase extends ThingBase {
    /**
     * A property-value pair representing an additional characteristic of the entity, e.g. a product feature or another characteristic for which there is no matching property in schema.org.
     *
     * Note: Publishers should be aware that applications designed to use specific schema.org properties (e.g. https://schema.org/width, https://schema.org/color, https://schema.org/gtin13, ...) will typically expect such data to be provided using those properties, rather than using the generic property/value mechanism.
     */
    "additionalProperty"?: SchemaValue<PropertyValue | IdReference, "additionalProperty">;
    /** Physical address of the item. */
    "address"?: SchemaValue<PostalAddress | Text | IdReference, "address">;
    /** The overall rating, based on a collection of reviews or ratings, of the item. */
    "aggregateRating"?: SchemaValue<AggregateRating | IdReference, "aggregateRating">;
    /** An amenity feature (e.g. a characteristic or service) of the Accommodation. This generic property does not make a statement about whether the feature is included in an offer for the main accommodation or available at extra costs. */
    "amenityFeature"?: SchemaValue<LocationFeatureSpecification | IdReference, "amenityFeature">;
    /**
     * A short textual code (also called "store code") that uniquely identifies a place of business. The code is typically assigned by the parentOrganization and used in structured URLs.
     *
     * For example, in the URL http://www.starbucks.co.uk/store-locator/etc/detail/3047 the code "3047" is a branchCode for a particular branch.
     */
    "branchCode"?: SchemaValue<Text, "branchCode">;
    /**
     * The basic containment relation between a place and one that contains it.
     *
     * @deprecated Consider using https://schema.org/containedInPlace instead.
     */
    "containedIn"?: SchemaValue<Place | IdReference, "containedIn">;
    /** The basic containment relation between a place and one that contains it. */
    "containedInPlace"?: SchemaValue<Place | IdReference, "containedInPlace">;
    /** The basic containment relation between a place and another that it contains. */
    "containsPlace"?: SchemaValue<Place | IdReference, "containsPlace">;
    /** Upcoming or past event associated with this place, organization, or action. */
    "event"?: SchemaValue<Event | IdReference, "event">;
    /**
     * Upcoming or past events associated with this place or organization.
     *
     * @deprecated Consider using https://schema.org/event instead.
     */
    "events"?: SchemaValue<Event | IdReference, "events">;
    /** The fax number. */
    "faxNumber"?: SchemaValue<Text, "faxNumber">;
    /** The geo coordinates of the place. */
    "geo"?: SchemaValue<GeoCoordinates | GeoShape | IdReference, "geo">;
    /** Represents a relationship between two geometries (or the places they represent), relating a containing geometry to a contained geometry. "a contains b iff no points of b lie in the exterior of a, and at least one point of the interior of b lies in the interior of a". As defined in {@link https://en.wikipedia.org/wiki/DE-9IM DE-9IM}. */
    "geoContains"?: SchemaValue<GeospatialGeometry | Place | IdReference, "geoContains">;
    /** Represents a relationship between two geometries (or the places they represent), relating a geometry to another that covers it. As defined in {@link https://en.wikipedia.org/wiki/DE-9IM DE-9IM}. */
    "geoCoveredBy"?: SchemaValue<GeospatialGeometry | Place | IdReference, "geoCoveredBy">;
    /** Represents a relationship between two geometries (or the places they represent), relating a covering geometry to a covered geometry. "Every point of b is a point of (the interior or boundary of) a". As defined in {@link https://en.wikipedia.org/wiki/DE-9IM DE-9IM}. */
    "geoCovers"?: SchemaValue<GeospatialGeometry | Place | IdReference, "geoCovers">;
    /** Represents a relationship between two geometries (or the places they represent), relating a geometry to another that crosses it: "a crosses b: they have some but not all interior points in common, and the dimension of the intersection is less than that of at least one of them". As defined in {@link https://en.wikipedia.org/wiki/DE-9IM DE-9IM}. */
    "geoCrosses"?: SchemaValue<GeospatialGeometry | Place | IdReference, "geoCrosses">;
    /** Represents spatial relations in which two geometries (or the places they represent) are topologically disjoint: "they have no point in common. They form a set of disconnected geometries." (A symmetric relationship, as defined in {@link https://en.wikipedia.org/wiki/DE-9IM DE-9IM}.) */
    "geoDisjoint"?: SchemaValue<GeospatialGeometry | Place | IdReference, "geoDisjoint">;
    /** Represents spatial relations in which two geometries (or the places they represent) are topologically equal, as defined in {@link https://en.wikipedia.org/wiki/DE-9IM DE-9IM}. "Two geometries are topologically equal if their interiors intersect and no part of the interior or boundary of one geometry intersects the exterior of the other" (a symmetric relationship). */
    "geoEquals"?: SchemaValue<GeospatialGeometry | Place | IdReference, "geoEquals">;
    /** Represents spatial relations in which two geometries (or the places they represent) have at least one point in common. As defined in {@link https://en.wikipedia.org/wiki/DE-9IM DE-9IM}. */
    "geoIntersects"?: SchemaValue<GeospatialGeometry | Place | IdReference, "geoIntersects">;
    /** Represents a relationship between two geometries (or the places they represent), relating a geometry to another that geospatially overlaps it, i.e. they have some but not all points in common. As defined in {@link https://en.wikipedia.org/wiki/DE-9IM DE-9IM}. */
    "geoOverlaps"?: SchemaValue<GeospatialGeometry | Place | IdReference, "geoOverlaps">;
    /** Represents spatial relations in which two geometries (or the places they represent) touch: "they have at least one boundary point in common, but no interior points." (A symmetric relationship, as defined in {@link https://en.wikipedia.org/wiki/DE-9IM DE-9IM}.) */
    "geoTouches"?: SchemaValue<GeospatialGeometry | Place | IdReference, "geoTouches">;
    /** Represents a relationship between two geometries (or the places they represent), relating a geometry to one that contains it, i.e. it is inside (i.e. within) its interior. As defined in {@link https://en.wikipedia.org/wiki/DE-9IM DE-9IM}. */
    "geoWithin"?: SchemaValue<GeospatialGeometry | Place | IdReference, "geoWithin">;
    /** The {@link http://www.gs1.org/gln Global Location Number} (GLN, sometimes also referred to as International Location Number or ILN) of the respective organization, person, or place. The GLN is a 13-digit number used to identify parties and physical locations. */
    "globalLocationNumber"?: SchemaValue<Text, "globalLocationNumber">;
    /** Certification information about a product, organization, service, place, or person. */
    "hasCertification"?: SchemaValue<Certification | IdReference, "hasCertification">;
    /** Indicates whether some facility (e.g. {@link https://schema.org/FoodEstablishment FoodEstablishment}, {@link https://schema.org/CovidTestingFacility CovidTestingFacility}) offers a service that can be used by driving through in a car. In the case of {@link https://schema.org/CovidTestingFacility CovidTestingFacility} such facilities could potentially help with social distancing from other potentially-infected users. */
    "hasDriveThroughService"?: SchemaValue<Boolean, "hasDriveThroughService">;
    /**
     * The {@link https://www.gs1.org/standards/gs1-digital-link GS1 digital link} associated with the object. This URL should conform to the particular requirements of digital links. The link should only contain the Application Identifiers (AIs) that are relevant for the entity being annotated, for instance a [[Product]] or an [[Organization]], and for the correct granularity. In particular, for products:- A Digital Link that contains a serial number (AI `21`) should only be present on instances of [[IndividualProduct]]
     * - A Digital Link that contains a lot number (AI `10`) should be annotated as [[SomeProduct]] if only products from that lot are sold, or [[IndividualProduct]] if there is only a specific product.
     * - A Digital Link that contains a global model number (AI `8013`) should be attached to a [[Product]] or a [[ProductModel]].
     * Other item types should be adapted similarly.
     */
    "hasGS1DigitalLink"?: SchemaValue<URL, "hasGS1DigitalLink">;
    /** A URL to a map of the place. */
    "hasMap"?: SchemaValue<Map | URL | IdReference, "hasMap">;
    /** A flag to signal that the item, event, or place is accessible for free. */
    "isAccessibleForFree"?: SchemaValue<Boolean, "isAccessibleForFree">;
    /** The International Standard of Industrial Classification of All Economic Activities (ISIC), Revision 4 code for a particular organization, business person, or place. */
    "isicV4"?: SchemaValue<Text, "isicV4">;
    /** Keywords or tags used to describe some item. Multiple textual entries in a keywords list are typically delimited by commas, or by repeating the property. */
    "keywords"?: SchemaValue<DefinedTerm | Text | URL | IdReference, "keywords">;
    /** The latitude of a location. For example `37.42242` ({@link https://en.wikipedia.org/wiki/World_Geodetic_System WGS 84}). */
    "latitude"?: SchemaValue<Number | Text, "latitude">;
    /** An associated logo. */
    "logo"?: SchemaValue<ImageObject | URL | IdReference, "logo">;
    /** The longitude of a location. For example `-122.08585` ({@link https://en.wikipedia.org/wiki/World_Geodetic_System WGS 84}). */
    "longitude"?: SchemaValue<Number | Text, "longitude">;
    /**
     * A URL to a map of the place.
     *
     * @deprecated Consider using https://schema.org/hasMap instead.
     */
    "map"?: SchemaValue<URL, "map">;
    /**
     * A URL to a map of the place.
     *
     * @deprecated Consider using https://schema.org/hasMap instead.
     */
    "maps"?: SchemaValue<URL, "maps">;
    /** The total number of individuals that may attend an event or venue. */
    "maximumAttendeeCapacity"?: SchemaValue<Integer, "maximumAttendeeCapacity">;
    /** The opening hours of a certain place. */
    "openingHoursSpecification"?: SchemaValue<OpeningHoursSpecification | IdReference, "openingHoursSpecification">;
    /** A photograph of this place. */
    "photo"?: SchemaValue<ImageObject | Photograph | IdReference, "photo">;
    /**
     * Photographs of this place.
     *
     * @deprecated Consider using https://schema.org/photo instead.
     */
    "photos"?: SchemaValue<ImageObject | Photograph | IdReference, "photos">;
    /** A flag to signal that the {@link https://schema.org/Place Place} is open to public visitors. If this property is omitted there is no assumed default boolean value. */
    "publicAccess"?: SchemaValue<Boolean, "publicAccess">;
    /** A review of the item. */
    "review"?: SchemaValue<Review | IdReference, "review">;
    /**
     * Review of the item.
     *
     * @deprecated Consider using https://schema.org/review instead.
     */
    "reviews"?: SchemaValue<Review | IdReference, "reviews">;
    /** A slogan or motto associated with the item. */
    "slogan"?: SchemaValue<Text, "slogan">;
    /** Indicates whether it is allowed to smoke in the place, e.g. in the restaurant, hotel or hotel room. */
    "smokingAllowed"?: SchemaValue<Boolean, "smokingAllowed">;
    /**
     * The special opening hours of a certain place.
     *
     * Use this to explicitly override general opening hours brought in scope by {@link https://schema.org/openingHoursSpecification openingHoursSpecification} or {@link https://schema.org/openingHours openingHours}.
     */
    "specialOpeningHoursSpecification"?: SchemaValue<OpeningHoursSpecification | IdReference, "specialOpeningHoursSpecification">;
    /** The telephone number. */
    "telephone"?: SchemaValue<Text, "telephone">;
    /** A page providing information on how to book a tour of some {@link https://schema.org/Place Place}, such as an {@link https://schema.org/Accommodation Accommodation} or {@link https://schema.org/ApartmentComplex ApartmentComplex} in a real estate setting, as well as other kinds of tours as appropriate. */
    "tourBookingPage"?: SchemaValue<URL, "tourBookingPage">;
}
interface PlaceLeaf extends PlaceBase {
    "@type": "Place";
}
/** Entities that have a somewhat fixed, physical extension. */
export type Place = PlaceLeaf | Accommodation | AdministrativeArea | CivicStructure | Landform | LandmarksOrHistoricalBuildings | LocalBusiness | Residence | TouristAttraction | TouristDestination | string;
interface PlaceOfWorshipLeaf extends CivicStructureBase {
    "@type": "PlaceOfWorship";
}
/** Place of worship, such as a church, synagogue, or mosque. */
export type PlaceOfWorship = PlaceOfWorshipLeaf | BuddhistTemple | Church | HinduTemple | Mosque | Synagogue | string;
interface PlanActionBase extends ActionBase {
    /** The time the object is scheduled to. */
    "scheduledTime"?: SchemaValue<Date | DateTime, "scheduledTime">;
}
interface PlanActionLeaf extends PlanActionBase {
    "@type": "PlanAction";
}
/** The act of planning the execution of an event/task/action/reservation/plan to a future date. */
export type PlanAction = PlanActionLeaf | CancelAction | ReserveAction | ScheduleAction;
interface PlasticSurgeryLeaf extends LocalBusinessBase {
    "@type": "PlasticSurgery";
}
/** A specific branch of medical science that pertains to therapeutic or cosmetic repair or re-formation of missing, injured or malformed tissues or body parts by manual and instrumental means. */
export type PlasticSurgery = PlasticSurgeryLeaf | string;
interface PlayLeaf extends CreativeWorkBase {
    "@type": "Play";
}
/** A play is a form of literature, usually consisting of dialogue between characters, intended for theatrical performance rather than just reading. Note: A performance of a Play would be a {@link https://schema.org/TheaterEvent TheaterEvent} or {@link https://schema.org/BroadcastEvent BroadcastEvent} - the _Play_ being the {@link https://schema.org/workPerformed workPerformed}. */
export type Play = PlayLeaf;
interface PlayActionBase extends ActionBase {
    /** An intended audience, i.e. a group for whom something was created. */
    "audience"?: SchemaValue<Audience | IdReference, "audience">;
    /** Upcoming or past event associated with this place, organization, or action. */
    "event"?: SchemaValue<Event | IdReference, "event">;
}
interface PlayActionLeaf extends PlayActionBase {
    "@type": "PlayAction";
}
/**
 * The act of playing/exercising/training/performing for enjoyment, leisure, recreation, competition or exercise.
 *
 * Related actions:
 * - {@link https://schema.org/ListenAction ListenAction}: Unlike ListenAction (which is under ConsumeAction), PlayAction refers to performing for an audience or at an event, rather than consuming music.
 * - {@link https://schema.org/WatchAction WatchAction}: Unlike WatchAction (which is under ConsumeAction), PlayAction refers to showing/displaying for an audience or at an event, rather than consuming visual content.
 */
export type PlayAction = PlayActionLeaf | ExerciseAction | PerformAction;
interface PlayGameActionBase extends ConsumeActionBase {
    /** Indicates the availability type of the game content associated with this action, such as whether it is a full version or a demo. */
    "gameAvailabilityType"?: SchemaValue<GameAvailabilityEnumeration | Text | IdReference, "gameAvailabilityType">;
}
interface PlayGameActionLeaf extends PlayGameActionBase {
    "@type": "PlayGameAction";
}
/** The act of playing a video game. */
export type PlayGameAction = PlayGameActionLeaf;
interface PlaygroundLeaf extends CivicStructureBase {
    "@type": "Playground";
}
/** A playground. */
export type Playground = PlaygroundLeaf | string;
interface PlumberLeaf extends LocalBusinessBase {
    "@type": "Plumber";
}
/** A plumbing service. */
export type Plumber = PlumberLeaf | string;
interface PodcastEpisodeLeaf extends EpisodeBase {
    "@type": "PodcastEpisode";
}
/** A single episode of a podcast series. */
export type PodcastEpisode = PodcastEpisodeLeaf;
interface PodcastSeasonLeaf extends CreativeWorkSeasonBase {
    "@type": "PodcastSeason";
}
/** A single season of a podcast. Many podcasts do not break down into separate seasons. In that case, PodcastSeries should be used. */
export type PodcastSeason = PodcastSeasonLeaf;
interface PodcastSeriesBase extends CreativeWorkSeriesBase {
    /** An actor (individual or a group), e.g. in TV, radio, movie, video games etc., or in an event. Actors can be associated with individual items or with a series, episode, clip. */
    "actor"?: SchemaValue<PerformingGroup | Person | IdReference, "actor">;
    /** The URL for a feed, e.g. associated with a podcast series, blog, or series of date-stamped updates. This is usually RSS or Atom. */
    "webFeed"?: SchemaValue<DataFeed | URL | IdReference, "webFeed">;
}
interface PodcastSeriesLeaf extends PodcastSeriesBase {
    "@type": "PodcastSeries";
}
/** A podcast is an episodic series of digital audio or video files which a user can download and listen to. */
export type PodcastSeries = PodcastSeriesLeaf;
interface PodiatricLeaf extends LocalBusinessBase {
    "@type": "Podiatric";
}
/** Podiatry is the care of the human foot, especially the diagnosis and treatment of foot disorders. */
export type Podiatric = PodiatricLeaf | string;
interface PoliceStationBase extends CivicStructureBase, LocalBusinessBase {
}
interface PoliceStationLeaf extends PoliceStationBase {
    "@type": "PoliceStation";
}
/** A police station. */
export type PoliceStation = PoliceStationLeaf | string;
interface PoliticalPartyLeaf extends OrganizationBase {
    "@type": "PoliticalParty";
}
/** Organization: Political Party. */
export type PoliticalParty = PoliticalPartyLeaf | string;
interface PondLeaf extends PlaceBase {
    "@type": "Pond";
}
/** A pond. */
export type Pond = PondLeaf | string;
interface PostalAddressBase extends ContactPointBase {
    /** The country. Recommended to be in 2-letter {@link http://en.wikipedia.org/wiki/ISO_3166-1 ISO 3166-1 alpha-2} format, for example "US". For backward compatibility, a 3-letter {@link https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3 ISO 3166-1 alpha-3} country code such as "SGP" or a full country name such as "Singapore" can also be used. */
    "addressCountry"?: SchemaValue<Country | Text | IdReference, "addressCountry">;
    /** The locality in which the street address is, and which is in the region. For example, Mountain View. */
    "addressLocality"?: SchemaValue<Text, "addressLocality">;
    /** The region in which the locality is, and which is in the country. For example, California or another appropriate first-level {@link https://en.wikipedia.org/wiki/List_of_administrative_divisions_by_country Administrative division}. */
    "addressRegion"?: SchemaValue<Text, "addressRegion">;
    /** The postal code. For example, 94043. */
    "postalCode"?: SchemaValue<Text, "postalCode">;
    /** The post office box number for PO box addresses. */
    "postOfficeBoxNumber"?: SchemaValue<Text, "postOfficeBoxNumber">;
    /** The street address. For example, 1600 Amphitheatre Pkwy. */
    "streetAddress"?: SchemaValue<Text, "streetAddress">;
}
interface PostalAddressLeaf extends PostalAddressBase {
    "@type": "PostalAddress";
}
/** The mailing address. */
export type PostalAddress = PostalAddressLeaf;
interface PostalCodeRangeSpecificationBase extends ThingBase {
    /** First postal code in a range (included). */
    "postalCodeBegin"?: SchemaValue<Text, "postalCodeBegin">;
    /** Last postal code in the range (included). Needs to be after {@link https://schema.org/postalCodeBegin postalCodeBegin}. */
    "postalCodeEnd"?: SchemaValue<Text, "postalCodeEnd">;
}
interface PostalCodeRangeSpecificationLeaf extends PostalCodeRangeSpecificationBase {
    "@type": "PostalCodeRangeSpecification";
}
/** Indicates a range of postal codes, usually defined as the set of valid codes between {@link https://schema.org/postalCodeBegin postalCodeBegin} and {@link https://schema.org/postalCodeEnd postalCodeEnd}, inclusively. */
export type PostalCodeRangeSpecification = PostalCodeRangeSpecificationLeaf;
interface PosterLeaf extends CreativeWorkBase {
    "@type": "Poster";
}
/** A large, usually printed placard, bill, or announcement, often illustrated, that is posted to advertise or publicize something. */
export type Poster = PosterLeaf;
interface PostOfficeLeaf extends LocalBusinessBase {
    "@type": "PostOffice";
}
/** A post office. */
export type PostOffice = PostOfficeLeaf | string;
interface PreOrderActionLeaf extends TradeActionBase {
    "@type": "PreOrderAction";
}
/** An agent orders a (not yet released) object/product/service to be delivered/sent. */
export type PreOrderAction = PreOrderActionLeaf;
interface PrependActionLeaf extends InsertActionBase {
    "@type": "PrependAction";
}
/** The act of inserting at the beginning if an ordered collection. */
export type PrependAction = PrependActionLeaf;
interface PreschoolLeaf extends EducationalOrganizationBase {
    "@type": "Preschool";
}
/** A preschool. */
export type Preschool = PreschoolLeaf | string;
interface PresentationDigitalDocumentLeaf extends DigitalDocumentBase {
    "@type": "PresentationDigitalDocument";
}
/** A file containing slides or used for a presentation. */
export type PresentationDigitalDocument = PresentationDigitalDocumentLeaf;
interface PreventionIndicationLeaf extends MedicalEntityBase {
    "@type": "PreventionIndication";
}
/** An indication for preventing an underlying condition, symptom, etc. */
export type PreventionIndication = PreventionIndicationLeaf;
interface PriceComponentTypeEnumerationLeaf extends EnumerationBase {
    "@type": "PriceComponentTypeEnumeration";
}
/** Enumerates different price components that together make up the total price for an offered product. */
export type PriceComponentTypeEnumeration = "https://schema.org/ActivationFee" | "ActivationFee" | "https://schema.org/CleaningFee" | "CleaningFee" | "https://schema.org/DistanceFee" | "DistanceFee" | "https://schema.org/Downpayment" | "Downpayment" | "https://schema.org/Installment" | "Installment" | "https://schema.org/Subscription" | "Subscription" | PriceComponentTypeEnumerationLeaf;
interface PriceSpecificationBase extends ThingBase {
    /** The interval and unit of measurement of ordering quantities for which the offer or price specification is valid. This allows e.g. specifying that a certain freight charge is valid only for a certain quantity. */
    "eligibleQuantity"?: SchemaValue<QuantitativeValue | IdReference, "eligibleQuantity">;
    /** The transaction volume, in a monetary unit, for which the offer or price specification is valid, e.g. for indicating a minimal purchasing volume, to express free shipping above a certain order volume, or to limit the acceptance of credit cards to purchases to a certain minimal amount. */
    "eligibleTransactionVolume"?: SchemaValue<PriceSpecification | IdReference, "eligibleTransactionVolume">;
    /** The highest price if the price is a range. */
    "maxPrice"?: SchemaValue<Number, "maxPrice">;
    /** The number of membership points earned by the member. If necessary, the unitText can be used to express the units the points are issued in. (E.g. stars, miles, etc.) */
    "membershipPointsEarned"?: SchemaValue<Number | QuantitativeValue | IdReference, "membershipPointsEarned">;
    /** The lowest price if the price is a range. */
    "minPrice"?: SchemaValue<Number, "minPrice">;
    /**
     * The offer price of a product, or of a price component when attached to PriceSpecification and its subtypes.
     *
     * Usage guidelines:
     * - Use the {@link https://schema.org/priceCurrency priceCurrency} property (with standard formats: {@link http://en.wikipedia.org/wiki/ISO_4217 ISO 4217 currency format}, e.g. "USD"; {@link https://en.wikipedia.org/wiki/List_of_cryptocurrencies Ticker symbol} for cryptocurrencies, e.g. "BTC"; well known names for {@link https://en.wikipedia.org/wiki/Local_exchange_trading_system Local Exchange Trading Systems} (LETS) and other currency types, e.g. "Ithaca HOUR") instead of including {@link http://en.wikipedia.org/wiki/Dollar_sign#Currencies_that_use_the_dollar_or_peso_sign ambiguous symbols} such as '$' in the value.
     * - Use '.' (Unicode 'FULL STOP' (U+002E)) rather than ',' to indicate a decimal point. Avoid using these symbols as a readability separator.
     * - Note that both {@link http://www.w3.org/TR/xhtml-rdfa-primer/#using-the-content-attribute RDFa} and Microdata syntax allow the use of a "content=" attribute for publishing simple machine-readable values alongside more human-friendly formatting.
     * - Use values from 0123456789 (Unicode 'DIGIT ZERO' (U+0030) to 'DIGIT NINE' (U+0039)) rather than superficially similar Unicode symbols.
     */
    "price"?: SchemaValue<Number | Text, "price">;
    /**
     * The currency of the price, or a price component when attached to {@link https://schema.org/PriceSpecification PriceSpecification} and its subtypes.
     *
     * Use standard formats: {@link http://en.wikipedia.org/wiki/ISO_4217 ISO 4217 currency format}, e.g. "USD"; {@link https://en.wikipedia.org/wiki/List_of_cryptocurrencies Ticker symbol} for cryptocurrencies, e.g. "BTC"; well known names for {@link https://en.wikipedia.org/wiki/Local_exchange_trading_system Local Exchange Trading Systems} (LETS) and other currency types, e.g. "Ithaca HOUR".
     */
    "priceCurrency"?: SchemaValue<Text, "priceCurrency">;
    /** The membership program tier an Offer (or a PriceSpecification, OfferShippingDetails, or MerchantReturnPolicy under an Offer) is valid for. */
    "validForMemberTier"?: SchemaValue<MemberProgramTier | IdReference, "validForMemberTier">;
    /** The date when the item becomes valid. */
    "validFrom"?: SchemaValue<Date | DateTime, "validFrom">;
    /** The date after when the item is not valid. For example the end of an offer, salary period, or a period of opening hours. */
    "validThrough"?: SchemaValue<Date | DateTime, "validThrough">;
    /** Specifies whether the applicable value-added tax (VAT) is included in the price specification or not. */
    "valueAddedTaxIncluded"?: SchemaValue<Boolean, "valueAddedTaxIncluded">;
}
interface PriceSpecificationLeaf extends PriceSpecificationBase {
    "@type": "PriceSpecification";
}
/** A structured value representing a price or price range. Typically, only the subclasses of this type are used for markup. It is recommended to use {@link https://schema.org/MonetaryAmount MonetaryAmount} to describe independent amounts of money such as a salary, credit card limits, etc. */
export type PriceSpecification = PriceSpecificationLeaf | CompoundPriceSpecification | DeliveryChargeSpecification | PaymentChargeSpecification | UnitPriceSpecification;
interface PriceTypeEnumerationLeaf extends EnumerationBase {
    "@type": "PriceTypeEnumeration";
}
/** Enumerates different price types, for example list price, invoice price, and sale price. */
export type PriceTypeEnumeration = "https://schema.org/InvoicePrice" | "InvoicePrice" | "https://schema.org/ListPrice" | "ListPrice" | "https://schema.org/MinimumAdvertisedPrice" | "MinimumAdvertisedPrice" | "https://schema.org/MSRP" | "MSRP" | "https://schema.org/RegularPrice" | "RegularPrice" | "https://schema.org/SalePrice" | "SalePrice" | "https://schema.org/SRP" | "SRP" | "https://schema.org/StrikethroughPrice" | "StrikethroughPrice" | PriceTypeEnumerationLeaf;
interface PrimaryCareLeaf extends LocalBusinessBase {
    "@type": "PrimaryCare";
}
/** The medical care by a physician, or other health-care professional, who is the patient's first contact with the health-care system and who may recommend a specialist if necessary. */
export type PrimaryCare = PrimaryCareLeaf | string;
interface ProductBase extends ThingBase {
    /**
     * A property-value pair representing an additional characteristic of the entity, e.g. a product feature or another characteristic for which there is no matching property in schema.org.
     *
     * Note: Publishers should be aware that applications designed to use specific schema.org properties (e.g. https://schema.org/width, https://schema.org/color, https://schema.org/gtin13, ...) will typically expect such data to be provided using those properties, rather than using the generic property/value mechanism.
     */
    "additionalProperty"?: SchemaValue<PropertyValue | IdReference, "additionalProperty">;
    /** The overall rating, based on a collection of reviews or ratings, of the item. */
    "aggregateRating"?: SchemaValue<AggregateRating | IdReference, "aggregateRating">;
    /**
     * An Amazon Standard Identification Number (ASIN) is a 10-character alphanumeric unique identifier assigned by Amazon.com and its partners for product identification within the Amazon organization (summary from {@link https://en.wikipedia.org/wiki/Amazon_Standard_Identification_Number Wikipedia}'s article).
     *
     * Note also that this is a definition for how to include ASINs in Schema.org data, and not a definition of ASINs in general - see documentation from Amazon for authoritative details. ASINs are most commonly encoded as text strings, but the [asin] property supports URL/URI as potential values too.
     */
    "asin"?: SchemaValue<Text | URL, "asin">;
    /** An intended audience, i.e. a group for whom something was created. */
    "audience"?: SchemaValue<Audience | IdReference, "audience">;
    /** An award won by or for this item. */
    "award"?: SchemaValue<Text, "award">;
    /**
     * Awards won by or for this item.
     *
     * @deprecated Consider using https://schema.org/award instead.
     */
    "awards"?: SchemaValue<Text, "awards">;
    /** The brand(s) associated with a product or service, or the brand(s) maintained by an organization or business person. */
    "brand"?: SchemaValue<Brand | Organization | IdReference, "brand">;
    /** A category for the item. Greater signs or slashes can be used to informally indicate a category hierarchy. */
    "category"?: SchemaValue<CategoryCode | PhysicalActivityCategory | Text | Thing | URL | IdReference, "category">;
    /** The color of the product. */
    "color"?: SchemaValue<Text, "color">;
    /** A color swatch image, visualizing the color of a {@link https://schema.org/Product Product}. Should match the textual description specified in the {@link https://schema.org/color color} property. This can be a URL or a fully described ImageObject. */
    "colorSwatch"?: SchemaValue<ImageObject | URL | IdReference, "colorSwatch">;
    /** The place where the product was assembled. */
    "countryOfAssembly"?: SchemaValue<Text, "countryOfAssembly">;
    /** The place where the item (typically {@link https://schema.org/Product Product}) was last processed and tested before importation. */
    "countryOfLastProcessing"?: SchemaValue<Text, "countryOfLastProcessing">;
    /**
     * The country of origin of something, including products as well as creative works such as movie and TV content.
     *
     * In the case of TV and movie, this would be the country of the principle offices of the production company or individual responsible for the movie. For other kinds of {@link https://schema.org/CreativeWork CreativeWork} it is difficult to provide fully general guidance, and properties such as {@link https://schema.org/contentLocation contentLocation} and {@link https://schema.org/locationCreated locationCreated} may be more applicable.
     *
     * In the case of products, the country of origin of the product. The exact interpretation of this may vary by context and product type, and cannot be fully enumerated here.
     */
    "countryOfOrigin"?: SchemaValue<Country | IdReference, "countryOfOrigin">;
    /** The depth of the item. */
    "depth"?: SchemaValue<Distance | QuantitativeValue | IdReference, "depth">;
    /** A {@link https://schema.org/Grant Grant} that directly or indirectly provide funding or sponsorship for this item. See also {@link https://schema.org/ownershipFundingInfo ownershipFundingInfo}. */
    "funding"?: SchemaValue<Grant | IdReference, "funding">;
    /**
     * A Global Trade Item Number ({@link https://www.gs1.org/standards/id-keys/gtin GTIN}). GTINs identify trade items, including products and services, using numeric identification codes.
     *
     * A correct {@link https://schema.org/gtin gtin} value should be a valid GTIN, which means that it should be an all-numeric string of either 8, 12, 13 or 14 digits, or a "GS1 Digital Link" URL based on such a string. The numeric component should also have a {@link https://www.gs1.org/services/check-digit-calculator valid GS1 check digit} and meet the other rules for valid GTINs. See also {@link http://www.gs1.org/barcodes/technical/idkeys/gtin GS1's GTIN Summary} and {@link https://en.wikipedia.org/wiki/Global_Trade_Item_Number Wikipedia} for more details. Left-padding of the gtin values is not required or encouraged. The {@link https://schema.org/gtin gtin} property generalizes the earlier {@link https://schema.org/gtin8 gtin8}, {@link https://schema.org/gtin12 gtin12}, {@link https://schema.org/gtin13 gtin13}, and {@link https://schema.org/gtin14 gtin14} properties.
     *
     * The GS1 {@link https://www.gs1.org/standards/Digital-Link/ digital link specifications} expresses GTINs as URLs (URIs, IRIs, etc.). Digital Links should be populated into the {@link https://schema.org/hasGS1DigitalLink hasGS1DigitalLink} attribute.
     *
     * Note also that this is a definition for how to include GTINs in Schema.org data, and not a definition of GTINs in general - see the GS1 documentation for authoritative details.
     */
    "gtin"?: SchemaValue<Text | URL, "gtin">;
    /** The GTIN-12 code of the product, or the product to which the offer refers. The GTIN-12 is the 12-digit GS1 Identification Key composed of a U.P.C. Company Prefix, Item Reference, and Check Digit used to identify trade items. See {@link http://www.gs1.org/barcodes/technical/idkeys/gtin GS1 GTIN Summary} for more details. */
    "gtin12"?: SchemaValue<Text, "gtin12">;
    /** The GTIN-13 code of the product, or the product to which the offer refers. This is equivalent to 13-digit ISBN codes and EAN UCC-13. Former 12-digit UPC codes can be converted into a GTIN-13 code by simply adding a preceding zero. See {@link http://www.gs1.org/barcodes/technical/idkeys/gtin GS1 GTIN Summary} for more details. */
    "gtin13"?: SchemaValue<Text, "gtin13">;
    /** The GTIN-14 code of the product, or the product to which the offer refers. See {@link http://www.gs1.org/barcodes/technical/idkeys/gtin GS1 GTIN Summary} for more details. */
    "gtin14"?: SchemaValue<Text, "gtin14">;
    /** The GTIN-8 code of the product, or the product to which the offer refers. This code is also known as EAN/UCC-8 or 8-digit EAN. See {@link http://www.gs1.org/barcodes/technical/idkeys/gtin GS1 GTIN Summary} for more details. */
    "gtin8"?: SchemaValue<Text, "gtin8">;
    /** Used to tag an item to be intended or suitable for consumption or use by adults only. */
    "hasAdultConsideration"?: SchemaValue<AdultOrientedEnumeration | IdReference, "hasAdultConsideration">;
    /** Certification information about a product, organization, service, place, or person. */
    "hasCertification"?: SchemaValue<Certification | IdReference, "hasCertification">;
    /** Defines the energy efficiency Category (also known as "class" or "rating") for a product according to an international energy efficiency standard. */
    "hasEnergyConsumptionDetails"?: SchemaValue<EnergyConsumptionDetails | IdReference, "hasEnergyConsumptionDetails">;
    /**
     * The {@link https://www.gs1.org/standards/gs1-digital-link GS1 digital link} associated with the object. This URL should conform to the particular requirements of digital links. The link should only contain the Application Identifiers (AIs) that are relevant for the entity being annotated, for instance a [[Product]] or an [[Organization]], and for the correct granularity. In particular, for products:- A Digital Link that contains a serial number (AI `21`) should only be present on instances of [[IndividualProduct]]
     * - A Digital Link that contains a lot number (AI `10`) should be annotated as [[SomeProduct]] if only products from that lot are sold, or [[IndividualProduct]] if there is only a specific product.
     * - A Digital Link that contains a global model number (AI `8013`) should be attached to a [[Product]] or a [[ProductModel]].
     * Other item types should be adapted similarly.
     */
    "hasGS1DigitalLink"?: SchemaValue<URL, "hasGS1DigitalLink">;
    /** A measurement of an item, For example, the inseam of pants, the wheel size of a bicycle, the gauge of a screw, or the carbon footprint measured for certification by an authority. Usually an exact measurement, but can also be a range of measurements for adjustable products, for example belts and ski bindings. */
    "hasMeasurement"?: SchemaValue<QuantitativeValue | IdReference, "hasMeasurement">;
    /** Specifies a MerchantReturnPolicy that may be applicable. */
    "hasMerchantReturnPolicy"?: SchemaValue<MerchantReturnPolicy | IdReference, "hasMerchantReturnPolicy">;
    /**
     * Indicates a ProductReturnPolicy that may be applicable.
     *
     * @deprecated Consider using https://schema.org/hasMerchantReturnPolicy instead.
     */
    "hasProductReturnPolicy"?: SchemaValue<ProductReturnPolicy | IdReference, "hasProductReturnPolicy">;
    /** The height of the item. */
    "height"?: SchemaValue<Distance | QuantitativeValue | IdReference, "height">;
    /** Indicates the {@link https://schema.org/productGroupID productGroupID} for a {@link https://schema.org/ProductGroup ProductGroup} that this product {@link https://schema.org/isVariantOf isVariantOf}. */
    "inProductGroupWithID"?: SchemaValue<Text, "inProductGroupWithID">;
    /** A pointer to another product (or multiple products) for which this product is an accessory or spare part. */
    "isAccessoryOrSparePartFor"?: SchemaValue<Product | IdReference, "isAccessoryOrSparePartFor">;
    /** A pointer to another product (or multiple products) for which this product is a consumable. */
    "isConsumableFor"?: SchemaValue<Product | IdReference, "isConsumableFor">;
    /** Indicates whether this content is family friendly. */
    "isFamilyFriendly"?: SchemaValue<Boolean, "isFamilyFriendly">;
    /** A pointer to another, somehow related product (or multiple products). */
    "isRelatedTo"?: SchemaValue<Product | Service | IdReference, "isRelatedTo">;
    /** A pointer to another, functionally similar product (or multiple products). */
    "isSimilarTo"?: SchemaValue<Product | Service | IdReference, "isSimilarTo">;
    /** Indicates the kind of product that this is a variant of. In the case of {@link https://schema.org/ProductModel ProductModel}, this is a pointer (from a ProductModel) to a base product from which this product is a variant. It is safe to infer that the variant inherits all product features from the base model, unless defined locally. This is not transitive. In the case of a {@link https://schema.org/ProductGroup ProductGroup}, the group description also serves as a template, representing a set of Products that vary on explicitly defined, specific dimensions only (so it defines both a set of variants, as well as which values distinguish amongst those variants). When used with {@link https://schema.org/ProductGroup ProductGroup}, this property can apply to any {@link https://schema.org/Product Product} included in the group. */
    "isVariantOf"?: SchemaValue<ProductGroup | ProductModel | IdReference, "isVariantOf">;
    /** A predefined value from OfferItemCondition specifying the condition of the product or service, or the products or services included in the offer. Also used for product return policies to specify the condition of products accepted for returns. */
    "itemCondition"?: SchemaValue<OfferItemCondition | IdReference, "itemCondition">;
    /** Keywords or tags used to describe some item. Multiple textual entries in a keywords list are typically delimited by commas, or by repeating the property. */
    "keywords"?: SchemaValue<DefinedTerm | Text | URL | IdReference, "keywords">;
    /** An associated logo. */
    "logo"?: SchemaValue<ImageObject | URL | IdReference, "logo">;
    /** The manufacturer of the product. */
    "manufacturer"?: SchemaValue<Organization | IdReference, "manufacturer">;
    /** A material that something is made from, e.g. leather, wool, cotton, paper. */
    "material"?: SchemaValue<Product | Text | URL | IdReference, "material">;
    /**
     * The {@link https://schema.org/mobileUrl mobileUrl} property is provided for specific situations in which data consumers need to determine whether one of several provided URLs is a dedicated 'mobile site'.
     *
     * To discourage over-use, and reflecting intial usecases, the property is expected only on {@link https://schema.org/Product Product} and {@link https://schema.org/Offer Offer}, rather than {@link https://schema.org/Thing Thing}. The general trend in web technology is towards {@link https://en.wikipedia.org/wiki/Responsive_web_design responsive design} in which content can be flexibly adapted to a wide range of browsing environments. Pages and sites referenced with the long-established {@link https://schema.org/url url} property should ideally also be usable on a wide variety of devices, including mobile phones. In most cases, it would be pointless and counter productive to attempt to update all {@link https://schema.org/url url} markup to use {@link https://schema.org/mobileUrl mobileUrl} for more mobile-oriented pages. The property is intended for the case when items (primarily {@link https://schema.org/Product Product} and {@link https://schema.org/Offer Offer}) have extra URLs hosted on an additional "mobile site" alongside the main one. It should not be taken as an endorsement of this publication style.
     */
    "mobileUrl"?: SchemaValue<Text, "mobileUrl">;
    /** The model of the product. Use with the URL of a ProductModel or a textual representation of the model identifier. The URL of the ProductModel can be from an external source. It is recommended to additionally provide strong product identifiers via the gtin8/gtin13/gtin14 and mpn properties. */
    "model"?: SchemaValue<ProductModel | Text | IdReference, "model">;
    /** The Manufacturer Part Number (MPN) of the product, or the product to which the offer refers. */
    "mpn"?: SchemaValue<Text, "mpn">;
    /**
     * Provides negative considerations regarding something, most typically in pro/con lists for reviews (alongside {@link https://schema.org/positiveNotes positiveNotes}). For symmetry
     *
     * In the case of a {@link https://schema.org/Review Review}, the property describes the {@link https://schema.org/itemReviewed itemReviewed} from the perspective of the review; in the case of a {@link https://schema.org/Product Product}, the product itself is being described. Since product descriptions tend to emphasise positive claims, it may be relatively unusual to find {@link https://schema.org/negativeNotes negativeNotes} used in this way. Nevertheless for the sake of symmetry, {@link https://schema.org/negativeNotes negativeNotes} can be used on {@link https://schema.org/Product Product}.
     *
     * The property values can be expressed either as unstructured text (repeated as necessary), or if ordered, as a list (in which case the most negative is at the beginning of the list).
     */
    "negativeNotes"?: SchemaValue<ItemList | ListItem | Text | WebContent | IdReference, "negativeNotes">;
    /** Indicates the {@link https://en.wikipedia.org/wiki/NATO_Stock_Number NATO stock number} (nsn) of a {@link https://schema.org/Product Product}. */
    "nsn"?: SchemaValue<Text, "nsn">;
    /** An offer to provide this item—for example, an offer to sell a product, rent the DVD of a movie, perform a service, or give away tickets to an event. Use {@link https://schema.org/businessFunction businessFunction} to indicate the kind of transaction offered, i.e. sell, lease, etc. This property can also be used to describe a {@link https://schema.org/Demand Demand}. While this property is listed as expected on a number of common types, it can be used in others. In that case, using a second type, such as Product or a subtype of Product, can clarify the nature of the offer. */
    "offers"?: SchemaValue<Demand | Offer | IdReference, "offers">;
    /** A pattern that something has, for example 'polka dot', 'striped', 'Canadian flag'. Values are typically expressed as text, although links to controlled value schemes are also supported. */
    "pattern"?: SchemaValue<DefinedTerm | Text | IdReference, "pattern">;
    /**
     * Provides positive considerations regarding something, for example product highlights or (alongside {@link https://schema.org/negativeNotes negativeNotes}) pro/con lists for reviews.
     *
     * In the case of a {@link https://schema.org/Review Review}, the property describes the {@link https://schema.org/itemReviewed itemReviewed} from the perspective of the review; in the case of a {@link https://schema.org/Product Product}, the product itself is being described.
     *
     * The property values can be expressed either as unstructured text (repeated as necessary), or if ordered, as a list (in which case the most positive is at the beginning of the list).
     */
    "positiveNotes"?: SchemaValue<ItemList | ListItem | Text | WebContent | IdReference, "positiveNotes">;
    /** The product identifier, such as ISBN. For example: `meta itemprop="productID" content="isbn:123-456-789"`. */
    "productID"?: SchemaValue<Text, "productID">;
    /** The date of production of the item, e.g. vehicle. */
    "productionDate"?: SchemaValue<Date, "productionDate">;
    /** The date the item, e.g. vehicle, was purchased by the current owner. */
    "purchaseDate"?: SchemaValue<Date, "purchaseDate">;
    /** The release date of a product or product model. This can be used to distinguish the exact variant of a product. */
    "releaseDate"?: SchemaValue<Date, "releaseDate">;
    /** A review of the item. */
    "review"?: SchemaValue<Review | IdReference, "review">;
    /**
     * Review of the item.
     *
     * @deprecated Consider using https://schema.org/review instead.
     */
    "reviews"?: SchemaValue<Review | IdReference, "reviews">;
    /** A standardized size of a product or creative work, specified either through a simple textual string (for example 'XL', '32Wx34L'), a QuantitativeValue with a unitCode, or a comprehensive and structured {@link https://schema.org/SizeSpecification SizeSpecification}; in other cases, the {@link https://schema.org/width width}, {@link https://schema.org/height height}, {@link https://schema.org/depth depth} and {@link https://schema.org/weight weight} properties may be more applicable. */
    "size"?: SchemaValue<DefinedTerm | QuantitativeValue | SizeSpecification | Text | IdReference, "size">;
    /** The Stock Keeping Unit (SKU), i.e. a merchant-specific identifier for a product or service, or the product to which the offer refers. */
    "sku"?: SchemaValue<Text, "sku">;
    /** A slogan or motto associated with the item. */
    "slogan"?: SchemaValue<Text, "slogan">;
    /** The weight of the product or person. */
    "weight"?: SchemaValue<QuantitativeValue | IdReference, "weight">;
    /** The width of the item. */
    "width"?: SchemaValue<Distance | QuantitativeValue | IdReference, "width">;
}
interface ProductLeaf extends ProductBase {
    "@type": "Product";
}
/** Any offered product or service. For example: a pair of shoes; a concert ticket; the rental of a car; a haircut; or an episode of a TV show streamed online. */
export type Product = ProductLeaf | DietarySupplement | Drug | IndividualProduct | ProductCollection | ProductGroup | ProductModel | SomeProducts | Vehicle;
interface ProductCollectionBase extends ProductBase, CollectionBase {
    /** This links to a node or nodes indicating the exact quantity of the products included in an {@link https://schema.org/Offer Offer} or {@link https://schema.org/ProductCollection ProductCollection}. */
    "includesObject"?: SchemaValue<TypeAndQuantityNode | IdReference, "includesObject">;
}
interface ProductCollectionLeaf extends ProductCollectionBase {
    "@type": "ProductCollection";
}
/** A set of products (either {@link https://schema.org/ProductGroup ProductGroup}s or specific variants) that are listed together e.g. in an {@link https://schema.org/Offer Offer}. */
export type ProductCollection = ProductCollectionLeaf;
interface ProductGroupBase extends ProductBase {
    /** Indicates a {@link https://schema.org/Product Product} that is a member of this {@link https://schema.org/ProductGroup ProductGroup} (or {@link https://schema.org/ProductModel ProductModel}). */
    "hasVariant"?: SchemaValue<Product | IdReference, "hasVariant">;
    /** Indicates a textual identifier for a ProductGroup. */
    "productGroupID"?: SchemaValue<Text, "productGroupID">;
    /** Indicates the property or properties by which the variants in a {@link https://schema.org/ProductGroup ProductGroup} vary, e.g. their size, color etc. Schema.org properties can be referenced by their short name e.g. "color"; terms defined elsewhere can be referenced with their URIs. */
    "variesBy"?: SchemaValue<DefinedTerm | Text | IdReference, "variesBy">;
}
interface ProductGroupLeaf extends ProductGroupBase {
    "@type": "ProductGroup";
}
/**
 * A ProductGroup represents a group of {@link https://schema.org/Product Product}s that vary only in certain well-described ways, such as by {@link https://schema.org/size size}, {@link https://schema.org/color color}, {@link https://schema.org/material material} etc.
 *
 * While a ProductGroup itself is not directly offered for sale, the various varying products that it represents can be. The ProductGroup serves as a prototype or template, standing in for all of the products who have an {@link https://schema.org/isVariantOf isVariantOf} relationship to it. As such, properties (including additional types) can be applied to the ProductGroup to represent characteristics shared by each of the (possibly very many) variants. Properties that reference a ProductGroup are not included in this mechanism; neither are the following specific properties {@link https://schema.org/variesBy variesBy}, {@link https://schema.org/hasVariant hasVariant}, {@link https://schema.org/url url}.
 */
export type ProductGroup = ProductGroupLeaf;
interface ProductModelBase extends ProductBase {
    /** Indicates the kind of product that this is a variant of. In the case of {@link https://schema.org/ProductModel ProductModel}, this is a pointer (from a ProductModel) to a base product from which this product is a variant. It is safe to infer that the variant inherits all product features from the base model, unless defined locally. This is not transitive. In the case of a {@link https://schema.org/ProductGroup ProductGroup}, the group description also serves as a template, representing a set of Products that vary on explicitly defined, specific dimensions only (so it defines both a set of variants, as well as which values distinguish amongst those variants). When used with {@link https://schema.org/ProductGroup ProductGroup}, this property can apply to any {@link https://schema.org/Product Product} included in the group. */
    "isVariantOf"?: SchemaValue<ProductGroup | ProductModel | IdReference, "isVariantOf">;
    /** A pointer from a previous, often discontinued variant of the product to its newer variant. */
    "predecessorOf"?: SchemaValue<ProductModel | IdReference, "predecessorOf">;
    /** A pointer from a newer variant of a product to its previous, often discontinued predecessor. */
    "successorOf"?: SchemaValue<ProductModel | IdReference, "successorOf">;
}
interface ProductModelLeaf extends ProductModelBase {
    "@type": "ProductModel";
}
/** A datasheet or vendor specification of a product (in the sense of a prototypical description). */
export type ProductModel = ProductModelLeaf;
interface ProductReturnEnumerationLeaf extends EnumerationBase {
    "@type": "ProductReturnEnumeration";
}
/**
 * ProductReturnEnumeration enumerates several kinds of product return policy. Note that this structure may not capture all aspects of the policy.
 *
 * @deprecated Use MerchantReturnEnumeration instead.
 */
export type ProductReturnEnumeration = "https://schema.org/ProductReturnFiniteReturnWindow" | "ProductReturnFiniteReturnWindow" | "https://schema.org/ProductReturnNotPermitted" | "ProductReturnNotPermitted" | "https://schema.org/ProductReturnUnlimitedWindow" | "ProductReturnUnlimitedWindow" | "https://schema.org/ProductReturnUnspecified" | "ProductReturnUnspecified" | ProductReturnEnumerationLeaf;
interface ProductReturnPolicyBase extends ThingBase {
    /**
     * The productReturnDays property indicates the number of days (from purchase) within which relevant product return policy is applicable.
     *
     * @deprecated Consider using https://schema.org/merchantReturnDays instead.
     */
    "productReturnDays"?: SchemaValue<Integer, "productReturnDays">;
    /**
     * Indicates a Web page or service by URL, for product return.
     *
     * @deprecated Consider using https://schema.org/merchantReturnLink instead.
     */
    "productReturnLink"?: SchemaValue<URL, "productReturnLink">;
}
interface ProductReturnPolicyLeaf extends ProductReturnPolicyBase {
    "@type": "ProductReturnPolicy";
}
/**
 * A ProductReturnPolicy provides information about product return policies associated with an {@link https://schema.org/Organization Organization} or {@link https://schema.org/Product Product}.
 *
 * @deprecated Use MerchantReturnPolicy instead.
 */
export type ProductReturnPolicy = ProductReturnPolicyLeaf;
interface ProfessionalServiceLeaf extends LocalBusinessBase {
    "@type": "ProfessionalService";
}
/**
 * Original definition: "provider of professional services."
 *
 * The general {@link https://schema.org/ProfessionalService ProfessionalService} type for local businesses was deprecated due to confusion with {@link https://schema.org/Service Service}. For reference, the types that it included were: {@link https://schema.org/Dentist Dentist}, {@link https://schema.org/AccountingService AccountingService}, {@link https://schema.org/Attorney Attorney}, {@link https://schema.org/Notary Notary}, as well as types for several kinds of {@link https://schema.org/HomeAndConstructionBusiness HomeAndConstructionBusiness}: {@link https://schema.org/Electrician Electrician}, {@link https://schema.org/GeneralContractor GeneralContractor}, {@link https://schema.org/HousePainter HousePainter}, {@link https://schema.org/Locksmith Locksmith}, {@link https://schema.org/Plumber Plumber}, {@link https://schema.org/RoofingContractor RoofingContractor}. {@link https://schema.org/LegalService LegalService} was introduced as a more inclusive supertype of {@link https://schema.org/Attorney Attorney}.
 */
export type ProfessionalService = ProfessionalServiceLeaf | string;
interface ProfilePageLeaf extends WebPageBase {
    "@type": "ProfilePage";
}
/** Web page type: Profile page. */
export type ProfilePage = ProfilePageLeaf;
interface ProgramMembershipBase extends ThingBase {
    /** The Organization (airline, travelers' club, retailer, etc.) the membership is made with or which offers the MemberProgram. */
    "hostingOrganization"?: SchemaValue<Organization | IdReference, "hostingOrganization">;
    /** A member of an Organization or a ProgramMembership. Organizations can be members of organizations; ProgramMembership is typically for individuals. */
    "member"?: SchemaValue<Organization | Person | IdReference, "member">;
    /**
     * A member of this organization.
     *
     * @deprecated Consider using https://schema.org/member instead.
     */
    "members"?: SchemaValue<Organization | Person | IdReference, "members">;
    /** A unique identifier for the membership. */
    "membershipNumber"?: SchemaValue<Text, "membershipNumber">;
    /** The number of membership points earned by the member. If necessary, the unitText can be used to express the units the points are issued in. (E.g. stars, miles, etc.) */
    "membershipPointsEarned"?: SchemaValue<Number | QuantitativeValue | IdReference, "membershipPointsEarned">;
    /** The {@link https://schema.org/MemberProgram MemberProgram} associated with a {@link https://schema.org/ProgramMembership ProgramMembership}. */
    "program"?: SchemaValue<MemberProgram | IdReference, "program">;
    /** The program providing the membership. It is preferable to use {@link https://schema.org/program :program} instead. */
    "programName"?: SchemaValue<Text, "programName">;
}
interface ProgramMembershipLeaf extends ProgramMembershipBase {
    "@type": "ProgramMembership";
}
/** Used to describe membership in a loyalty programs (e.g. "StarAliance"), traveler clubs (e.g. "AAA"), purchase clubs ("Safeway Club"), etc. */
export type ProgramMembership = ProgramMembershipLeaf;
interface ProjectLeaf extends OrganizationBase {
    "@type": "Project";
}
/** An enterprise (potentially individual but typically collaborative), planned to achieve a particular aim. Use properties from {@link https://schema.org/Organization Organization}, {@link https://schema.org/subOrganization subOrganization}/{@link https://schema.org/parentOrganization parentOrganization} to indicate project sub-structures. */
export type Project = ProjectLeaf | FundingAgency | ResearchProject | string;
interface PronounceableTextBase extends Partial<IdReference> {
    /** The language of the content or performance or used in an action. Please use one of the language codes from the {@link http://tools.ietf.org/html/bcp47 IETF BCP 47 standard}. See also {@link https://schema.org/availableLanguage availableLanguage}. */
    "inLanguage"?: SchemaValue<Language | Text | IdReference, "inLanguage">;
    /** Representation of a text {@link https://schema.org/textValue textValue} using the specified {@link https://schema.org/speechToTextMarkup speechToTextMarkup}. For example the city name of Houston in IPA: /ˈhjuːstən/. */
    "phoneticText"?: SchemaValue<Text, "phoneticText">;
    /** Form of markup used. eg. {@link https://www.w3.org/TR/speech-synthesis11 SSML} or {@link https://www.wikidata.org/wiki/Property:P898 IPA}. */
    "speechToTextMarkup"?: SchemaValue<Text, "speechToTextMarkup">;
    /** Text value being annotated. */
    "textValue"?: SchemaValue<Text, "textValue">;
}
interface PronounceableTextLeaf extends PronounceableTextBase {
    "@type": "PronounceableText";
}
/** Data type: PronounceableText. */
export type PronounceableText = PronounceableTextLeaf | string;
interface PropertyBase extends ThingBase {
    /** Relates a property to a class that is (one of) the type(s) the property is expected to be used on. */
    "domainIncludes"?: SchemaValue<Class | IdReference, "domainIncludes">;
    /** Relates a property to a property that is its inverse. Inverse properties relate the same pairs of items to each other, but in reversed direction. For example, the 'alumni' and 'alumniOf' properties are inverseOf each other. Some properties don't have explicit inverses; in these situations RDFa and JSON-LD syntax for reverse properties can be used. */
    "inverseOf"?: SchemaValue<Property | IdReference, "inverseOf">;
    /** Relates a property to a class that constitutes (one of) the expected type(s) for values of the property. */
    "rangeIncludes"?: SchemaValue<Class | IdReference, "rangeIncludes">;
    /** Relates a term (i.e. a property, class or enumeration) to one that supersedes it. */
    "supersededBy"?: SchemaValue<Class | Enumeration | Property | IdReference, "supersededBy">;
}
interface PropertyLeaf extends PropertyBase {
    "@type": "Property";
}
/** A property, used to indicate attributes and relationships of some Thing; equivalent to rdf:Property. */
export type Property = PropertyLeaf;
interface PropertyValueBase extends ThingBase {
    /** The upper value of some characteristic or property. */
    "maxValue"?: SchemaValue<Number, "maxValue">;
    /** A subproperty of {@link https://schema.org/measurementTechnique measurementTechnique} that can be used for specifying specific methods, in particular via {@link https://schema.org/MeasurementMethodEnum MeasurementMethodEnum}. */
    "measurementMethod"?: SchemaValue<DefinedTerm | MeasurementMethodEnum | Text | URL | IdReference, "measurementMethod">;
    /**
     * A technique, method or technology used in an {@link https://schema.org/Observation Observation}, {@link https://schema.org/StatisticalVariable StatisticalVariable} or {@link https://schema.org/Dataset Dataset} (or {@link https://schema.org/DataDownload DataDownload}, {@link https://schema.org/DataCatalog DataCatalog}), corresponding to the method used for measuring the corresponding variable(s) (for datasets, described using {@link https://schema.org/variableMeasured variableMeasured}; for {@link https://schema.org/Observation Observation}, a {@link https://schema.org/StatisticalVariable StatisticalVariable}). Often but not necessarily each {@link https://schema.org/variableMeasured variableMeasured} will have an explicit representation as (or mapping to) an property such as those defined in Schema.org, or other RDF vocabularies and "knowledge graphs". In that case the subproperty of {@link https://schema.org/variableMeasured variableMeasured} called {@link https://schema.org/measuredProperty measuredProperty} is applicable.
     *
     * The {@link https://schema.org/measurementTechnique measurementTechnique} property helps when extra clarification is needed about how a {@link https://schema.org/measuredProperty measuredProperty} was measured. This is oriented towards scientific and scholarly dataset publication but may have broader applicability; it is not intended as a full representation of measurement, but can often serve as a high level summary for dataset discovery.
     *
     * For example, if {@link https://schema.org/variableMeasured variableMeasured} is: molecule concentration, {@link https://schema.org/measurementTechnique measurementTechnique} could be: "mass spectrometry" or "nmr spectroscopy" or "colorimetry" or "immunofluorescence". If the {@link https://schema.org/variableMeasured variableMeasured} is "depression rating", the {@link https://schema.org/measurementTechnique measurementTechnique} could be "Zung Scale" or "HAM-D" or "Beck Depression Inventory".
     *
     * If there are several {@link https://schema.org/variableMeasured variableMeasured} properties recorded for some given data object, use a {@link https://schema.org/PropertyValue PropertyValue} for each {@link https://schema.org/variableMeasured variableMeasured} and attach the corresponding {@link https://schema.org/measurementTechnique measurementTechnique}. The value can also be from an enumeration, organized as a {@link https://schema.org/MeasurementMetholdEnumeration MeasurementMetholdEnumeration}.
     */
    "measurementTechnique"?: SchemaValue<DefinedTerm | MeasurementMethodEnum | Text | URL | IdReference, "measurementTechnique">;
    /** The lower value of some characteristic or property. */
    "minValue"?: SchemaValue<Number, "minValue">;
    /** A commonly used identifier for the characteristic represented by the property, e.g. a manufacturer or a standard code for a property. propertyID can be (1) a prefixed string, mainly meant to be used with standards for product properties; (2) a site-specific, non-prefixed string (e.g. the primary key of the property or the vendor-specific ID of the property), or (3) a URL indicating the type of the property, either pointing to an external vocabulary, or a Web resource that describes the property (e.g. a glossary entry). Standards bodies should promote a standard prefix for the identifiers of properties from their standards. */
    "propertyID"?: SchemaValue<Text | URL, "propertyID">;
    /** The unit of measurement given using the UN/CEFACT Common Code (3 characters) or a URL. Other codes than the UN/CEFACT Common Code may be used with a prefix followed by a colon. */
    "unitCode"?: SchemaValue<Text | URL, "unitCode">;
    /** A string or text indicating the unit of measurement. Useful if you cannot provide a standard unit code for {@link unitCode unitCode}. */
    "unitText"?: SchemaValue<Text, "unitText">;
    /**
     * The value of a {@link https://schema.org/QuantitativeValue QuantitativeValue} (including {@link https://schema.org/Observation Observation}) or property value node.
     * - For {@link https://schema.org/QuantitativeValue QuantitativeValue} and {@link https://schema.org/MonetaryAmount MonetaryAmount}, the recommended type for values is 'Number'.
     * - For {@link https://schema.org/PropertyValue PropertyValue}, it can be 'Text', 'Number', 'Boolean', or 'StructuredValue'.
     * - Use values from 0123456789 (Unicode 'DIGIT ZERO' (U+0030) to 'DIGIT NINE' (U+0039)) rather than superficially similar Unicode symbols.
     * - Use '.' (Unicode 'FULL STOP' (U+002E)) rather than ',' to indicate a decimal point. Avoid using these symbols as a readability separator.
     */
    "value"?: SchemaValue<Boolean | Number | StructuredValue | Text | IdReference, "value">;
    /** A secondary value that provides additional information on the original value, e.g. a reference temperature or a type of measurement. */
    "valueReference"?: SchemaValue<DefinedTerm | Enumeration | MeasurementTypeEnumeration | PropertyValue | QualitativeValue | QuantitativeValue | StructuredValue | Text | IdReference, "valueReference">;
}
interface PropertyValueLeaf extends PropertyValueBase {
    "@type": "PropertyValue";
}
/**
 * A property-value pair, e.g. representing a feature of a product or place. Use the 'name' property for the name of the property. If there is an additional human-readable version of the value, put that into the 'description' property.
 *
 * Always use specific schema.org properties when a) they exist and b) you can populate them. Using PropertyValue as a substitute will typically not trigger the same effect as using the original, specific property.
 */
export type PropertyValue = PropertyValueLeaf | LocationFeatureSpecification;
interface PropertyValueSpecificationBase extends ThingBase {
    /** The default value of the input. For properties that expect a literal, the default is a literal value, for properties that expect an object, it's an ID reference to one of the current values. */
    "defaultValue"?: SchemaValue<Text | Thing | IdReference, "defaultValue">;
    /** The upper value of some characteristic or property. */
    "maxValue"?: SchemaValue<Number, "maxValue">;
    /** The lower value of some characteristic or property. */
    "minValue"?: SchemaValue<Number, "minValue">;
    /** Whether multiple values are allowed for the property. Default is false. */
    "multipleValues"?: SchemaValue<Boolean, "multipleValues">;
    /** Whether or not a property is mutable. Default is false. Specifying this for a property that also has a value makes it act similar to a "hidden" input in an HTML form. */
    "readonlyValue"?: SchemaValue<Boolean, "readonlyValue">;
    /** The stepValue attribute indicates the granularity that is expected (and required) of the value in a PropertyValueSpecification. */
    "stepValue"?: SchemaValue<Number, "stepValue">;
    /** Specifies the allowed range for number of characters in a literal value. */
    "valueMaxLength"?: SchemaValue<Number, "valueMaxLength">;
    /** Specifies the minimum allowed range for number of characters in a literal value. */
    "valueMinLength"?: SchemaValue<Number, "valueMinLength">;
    /** Indicates the name of the PropertyValueSpecification to be used in URL templates and form encoding in a manner analogous to HTML's input@name. */
    "valueName"?: SchemaValue<Text, "valueName">;
    /** Specifies a regular expression for testing literal values according to the HTML spec. */
    "valuePattern"?: SchemaValue<Text, "valuePattern">;
    /** Whether the property must be filled in to complete the action. Default is false. */
    "valueRequired"?: SchemaValue<Boolean, "valueRequired">;
}
interface PropertyValueSpecificationLeaf extends PropertyValueSpecificationBase {
    "@type": "PropertyValueSpecification";
}
/** A Property value specification. */
export type PropertyValueSpecification = PropertyValueSpecificationLeaf;
interface ProteinBase extends BioChemEntityBase {
    /** A symbolic representation of a BioChemEntity. For example, a nucleotide sequence of a Gene or an amino acid sequence of a Protein. */
    "hasBioPolymerSequence"?: SchemaValue<Text, "hasBioPolymerSequence">;
}
interface ProteinLeaf extends ProteinBase {
    "@type": "Protein";
}
/** Protein is here used in its widest possible definition, as classes of amino acid based molecules. Amyloid-beta Protein in human (UniProt P05067), eukaryota (e.g. an OrthoDB group) or even a single molecule that one can point to are all of type :Protein. A protein can thus be a subclass of another protein, e.g. :Protein as a UniProt record can have multiple isoforms inside it which would also be :Protein. They can be imagined, synthetic, hypothetical or naturally occurring. */
export type Protein = ProteinLeaf;
interface PsychiatricLeaf extends LocalBusinessBase {
    "@type": "Psychiatric";
}
/** A specific branch of medical science that is concerned with the study, treatment, and prevention of mental illness, using both medical and psychological therapies. */
export type Psychiatric = PsychiatricLeaf | string;
interface PsychologicalTreatmentLeaf extends TherapeuticProcedureBase {
    "@type": "PsychologicalTreatment";
}
/** A process of care relying upon counseling, dialogue and communication aimed at improving a mental health condition without use of drugs. */
export type PsychologicalTreatment = PsychologicalTreatmentLeaf;
interface PublicationEventBase extends EventBase {
    /**
     * A flag to signal that the item, event, or place is accessible for free.
     *
     * @deprecated Consider using https://schema.org/isAccessibleForFree instead.
     */
    "free"?: SchemaValue<Boolean, "free">;
    /** An agent associated with the publication event. */
    "publishedBy"?: SchemaValue<Organization | Person | IdReference, "publishedBy">;
    /** A broadcast service associated with the publication event. */
    "publishedOn"?: SchemaValue<BroadcastService | IdReference, "publishedOn">;
}
interface PublicationEventLeaf extends PublicationEventBase {
    "@type": "PublicationEvent";
}
/** A PublicationEvent corresponds indifferently to the event of publication for a CreativeWork of any type, e.g. a broadcast event, an on-demand event, a book/journal publication via a variety of delivery media. */
export type PublicationEvent = PublicationEventLeaf | BroadcastEvent | OnDemandEvent;
interface PublicationIssueBase extends CreativeWorkBase {
    /** Identifies the issue of publication; for example, "iii" or "2". */
    "issueNumber"?: SchemaValue<Integer | Text, "issueNumber">;
    /** The page on which the work ends; for example "138" or "xvi". */
    "pageEnd"?: SchemaValue<Integer | Text, "pageEnd">;
    /** The page on which the work starts; for example "135" or "xiii". */
    "pageStart"?: SchemaValue<Integer | Text, "pageStart">;
    /** Any description of pages that is not separated into pageStart and pageEnd; for example, "1-6, 9, 55" or "10-12, 46-49". */
    "pagination"?: SchemaValue<Text, "pagination">;
}
interface PublicationIssueLeaf extends PublicationIssueBase {
    "@type": "PublicationIssue";
}
/**
 * A part of a successively published publication such as a periodical or publication volume, often numbered, usually containing a grouping of works such as articles.
 *
 * See also {@link http://blog.schema.org/2014/09/schemaorg-support-for-bibliographic_2.html blog post}.
 */
export type PublicationIssue = PublicationIssueLeaf | ComicIssue;
interface PublicationVolumeBase extends CreativeWorkBase {
    /** The page on which the work ends; for example "138" or "xvi". */
    "pageEnd"?: SchemaValue<Integer | Text, "pageEnd">;
    /** The page on which the work starts; for example "135" or "xiii". */
    "pageStart"?: SchemaValue<Integer | Text, "pageStart">;
    /** Any description of pages that is not separated into pageStart and pageEnd; for example, "1-6, 9, 55" or "10-12, 46-49". */
    "pagination"?: SchemaValue<Text, "pagination">;
    /** Identifies the volume of publication or multi-part work; for example, "iii" or "2". */
    "volumeNumber"?: SchemaValue<Integer | Text, "volumeNumber">;
}
interface PublicationVolumeLeaf extends PublicationVolumeBase {
    "@type": "PublicationVolume";
}
/**
 * A part of a successively published publication such as a periodical or multi-volume work, often numbered. It may represent a time span, such as a year.
 *
 * See also {@link http://blog.schema.org/2014/09/schemaorg-support-for-bibliographic_2.html blog post}.
 */
export type PublicationVolume = PublicationVolumeLeaf;
interface PublicHealthLeaf extends LocalBusinessBase {
    "@type": "PublicHealth";
}
/** Branch of medicine that pertains to the health services to improve and protect community health, especially epidemiology, sanitation, immunization, and preventive medicine. */
export type PublicHealth = PublicHealthLeaf | string;
interface PublicSwimmingPoolLeaf extends LocalBusinessBase {
    "@type": "PublicSwimmingPool";
}
/** A public swimming pool. */
export type PublicSwimmingPool = PublicSwimmingPoolLeaf | string;
interface PublicToiletLeaf extends CivicStructureBase {
    "@type": "PublicToilet";
}
/** A public toilet is a room or small building containing one or more toilets (and possibly also urinals) which is available for use by the general public, or by customers or employees of certain businesses. */
export type PublicToilet = PublicToiletLeaf | string;
interface QAPageLeaf extends WebPageBase {
    "@type": "QAPage";
}
/** A QAPage is a WebPage focussed on a specific Question and its Answer(s), e.g. in a question answering site or documenting Frequently Asked Questions (FAQs). */
export type QAPage = QAPageLeaf;
interface QualitativeValueBase extends EnumerationBase {
    /**
     * A property-value pair representing an additional characteristic of the entity, e.g. a product feature or another characteristic for which there is no matching property in schema.org.
     *
     * Note: Publishers should be aware that applications designed to use specific schema.org properties (e.g. https://schema.org/width, https://schema.org/color, https://schema.org/gtin13, ...) will typically expect such data to be provided using those properties, rather than using the generic property/value mechanism.
     */
    "additionalProperty"?: SchemaValue<PropertyValue | IdReference, "additionalProperty">;
    /** This ordering relation for qualitative values indicates that the subject is equal to the object. */
    "equal"?: SchemaValue<QualitativeValue | IdReference, "equal">;
    /** This ordering relation for qualitative values indicates that the subject is greater than the object. */
    "greater"?: SchemaValue<QualitativeValue | IdReference, "greater">;
    /** This ordering relation for qualitative values indicates that the subject is greater than or equal to the object. */
    "greaterOrEqual"?: SchemaValue<QualitativeValue | IdReference, "greaterOrEqual">;
    /** This ordering relation for qualitative values indicates that the subject is lesser than the object. */
    "lesser"?: SchemaValue<QualitativeValue | IdReference, "lesser">;
    /** This ordering relation for qualitative values indicates that the subject is lesser than or equal to the object. */
    "lesserOrEqual"?: SchemaValue<QualitativeValue | IdReference, "lesserOrEqual">;
    /** This ordering relation for qualitative values indicates that the subject is not equal to the object. */
    "nonEqual"?: SchemaValue<QualitativeValue | IdReference, "nonEqual">;
    /** A secondary value that provides additional information on the original value, e.g. a reference temperature or a type of measurement. */
    "valueReference"?: SchemaValue<DefinedTerm | Enumeration | MeasurementTypeEnumeration | PropertyValue | QualitativeValue | QuantitativeValue | StructuredValue | Text | IdReference, "valueReference">;
}
interface QualitativeValueLeaf extends QualitativeValueBase {
    "@type": "QualitativeValue";
}
/** A predefined value for a product characteristic, e.g. the power cord plug type 'US' or the garment sizes 'S', 'M', 'L', and 'XL'. */
export type QualitativeValue = QualitativeValueLeaf | BedType | DriveWheelConfigurationValue | SizeSpecification | SteeringPositionValue;
interface QuantitativeValueBase extends ThingBase {
    /**
     * A property-value pair representing an additional characteristic of the entity, e.g. a product feature or another characteristic for which there is no matching property in schema.org.
     *
     * Note: Publishers should be aware that applications designed to use specific schema.org properties (e.g. https://schema.org/width, https://schema.org/color, https://schema.org/gtin13, ...) will typically expect such data to be provided using those properties, rather than using the generic property/value mechanism.
     */
    "additionalProperty"?: SchemaValue<PropertyValue | IdReference, "additionalProperty">;
    /** The upper value of some characteristic or property. */
    "maxValue"?: SchemaValue<Number, "maxValue">;
    /** The lower value of some characteristic or property. */
    "minValue"?: SchemaValue<Number, "minValue">;
    /** The unit of measurement given using the UN/CEFACT Common Code (3 characters) or a URL. Other codes than the UN/CEFACT Common Code may be used with a prefix followed by a colon. */
    "unitCode"?: SchemaValue<Text | URL, "unitCode">;
    /** A string or text indicating the unit of measurement. Useful if you cannot provide a standard unit code for {@link unitCode unitCode}. */
    "unitText"?: SchemaValue<Text, "unitText">;
    /**
     * The value of a {@link https://schema.org/QuantitativeValue QuantitativeValue} (including {@link https://schema.org/Observation Observation}) or property value node.
     * - For {@link https://schema.org/QuantitativeValue QuantitativeValue} and {@link https://schema.org/MonetaryAmount MonetaryAmount}, the recommended type for values is 'Number'.
     * - For {@link https://schema.org/PropertyValue PropertyValue}, it can be 'Text', 'Number', 'Boolean', or 'StructuredValue'.
     * - Use values from 0123456789 (Unicode 'DIGIT ZERO' (U+0030) to 'DIGIT NINE' (U+0039)) rather than superficially similar Unicode symbols.
     * - Use '.' (Unicode 'FULL STOP' (U+002E)) rather than ',' to indicate a decimal point. Avoid using these symbols as a readability separator.
     */
    "value"?: SchemaValue<Boolean | Number | StructuredValue | Text | IdReference, "value">;
    /** A secondary value that provides additional information on the original value, e.g. a reference temperature or a type of measurement. */
    "valueReference"?: SchemaValue<DefinedTerm | Enumeration | MeasurementTypeEnumeration | PropertyValue | QualitativeValue | QuantitativeValue | StructuredValue | Text | IdReference, "valueReference">;
}
interface QuantitativeValueLeaf extends QuantitativeValueBase {
    "@type": "QuantitativeValue";
}
/** A point value or interval for product characteristics and other purposes. */
export type QuantitativeValue = QuantitativeValueLeaf | Observation;
interface QuantitativeValueDistributionBase extends ThingBase {
    /** The duration of the item (movie, audio recording, event, etc.) in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 duration format}. */
    "duration"?: SchemaValue<Duration | IdReference, "duration">;
    /** The median value. */
    "median"?: SchemaValue<Number, "median">;
    /** The 10th percentile value. */
    "percentile10"?: SchemaValue<Number, "percentile10">;
    /** The 25th percentile value. */
    "percentile25"?: SchemaValue<Number, "percentile25">;
    /** The 75th percentile value. */
    "percentile75"?: SchemaValue<Number, "percentile75">;
    /** The 90th percentile value. */
    "percentile90"?: SchemaValue<Number, "percentile90">;
}
interface QuantitativeValueDistributionLeaf extends QuantitativeValueDistributionBase {
    "@type": "QuantitativeValueDistribution";
}
/** A statistical distribution of values. */
export type QuantitativeValueDistribution = QuantitativeValueDistributionLeaf | MonetaryAmountDistribution;
interface QuantityLeaf extends ThingBase {
    "@type": "Quantity";
}
/** Quantities such as distance, time, mass, weight, etc. Particular instances of say Mass are entities like '3 kg' or '4 milligrams'. */
export type Quantity = QuantityLeaf | Distance | Duration | Energy | Mass | string;
interface QuestionBase extends CommentBase {
    /** The answer(s) that has been accepted as best, typically on a Question/Answer site. Sites vary in their selection mechanisms, e.g. drawing on community opinion and/or the view of the Question author. */
    "acceptedAnswer"?: SchemaValue<Answer | ItemList | IdReference, "acceptedAnswer">;
    /** The number of answers this question has received. */
    "answerCount"?: SchemaValue<Integer, "answerCount">;
    /** For questions that are part of learning resources (e.g. Quiz), eduQuestionType indicates the format of question being given. Example: "Multiple choice", "Open ended", "Flashcard". */
    "eduQuestionType"?: SchemaValue<Text, "eduQuestionType">;
    /** The parent of a question, answer or item in general. Typically used for Q/A discussion threads e.g. a chain of comments with the first comment being an {@link https://schema.org/Article Article} or other {@link https://schema.org/CreativeWork CreativeWork}. See also {@link https://schema.org/comment comment} which points from something to a comment about it. */
    "parentItem"?: SchemaValue<Comment | CreativeWork | IdReference, "parentItem">;
    /** An answer (possibly one of several, possibly incorrect) to a Question, e.g. on a Question/Answer site. */
    "suggestedAnswer"?: SchemaValue<Answer | ItemList | IdReference, "suggestedAnswer">;
}
interface QuestionLeaf extends QuestionBase {
    "@type": "Question";
}
/** A specific question - e.g. from a user seeking answers online, or collected in a Frequently Asked Questions (FAQ) document. */
export type Question = QuestionLeaf;
interface QuizLeaf extends LearningResourceBase {
    "@type": "Quiz";
}
/** Quiz: A test of knowledge, skills and abilities. */
export type Quiz = QuizLeaf;
interface QuotationBase extends CreativeWorkBase {
    /** The (e.g. fictional) character, Person or Organization to whom the quotation is attributed within the containing CreativeWork. */
    "spokenByCharacter"?: SchemaValue<Organization | Person | IdReference, "spokenByCharacter">;
}
interface QuotationLeaf extends QuotationBase {
    "@type": "Quotation";
}
/** A quotation. Often but not necessarily from some written work, attributable to a real world author and - if associated with a fictional character - to any fictional Person. Use {@link https://schema.org/isBasedOn isBasedOn} to link to source/origin. The {@link https://schema.org/recordedIn recordedIn} property can be used to reference a Quotation from an {@link https://schema.org/Event Event}. */
export type Quotation = QuotationLeaf;
interface QuoteActionLeaf extends TradeActionBase {
    "@type": "QuoteAction";
}
/** An agent quotes/estimates/appraises an object/product/service with a price at a location/store. */
export type QuoteAction = QuoteActionLeaf;
interface RadiationTherapyLeaf extends MedicalTherapyBase {
    "@type": "RadiationTherapy";
}
/** A process of care using radiation aimed at improving a health condition. */
export type RadiationTherapy = RadiationTherapyLeaf;
interface RadioBroadcastServiceLeaf extends BroadcastServiceBase {
    "@type": "RadioBroadcastService";
}
/** A delivery service through which radio content is provided via broadcast over the air or online. */
export type RadioBroadcastService = RadioBroadcastServiceLeaf;
interface RadioChannelLeaf extends BroadcastChannelBase {
    "@type": "RadioChannel";
}
/** A unique instance of a radio BroadcastService on a CableOrSatelliteService lineup. */
export type RadioChannel = RadioChannelLeaf | AMRadioChannel | FMRadioChannel;
interface RadioClipLeaf extends ClipBase {
    "@type": "RadioClip";
}
/** A short radio program or a segment/part of a radio program. */
export type RadioClip = RadioClipLeaf;
interface RadioEpisodeLeaf extends EpisodeBase {
    "@type": "RadioEpisode";
}
/** A radio episode which can be part of a series or season. */
export type RadioEpisode = RadioEpisodeLeaf;
interface RadioSeasonLeaf extends CreativeWorkSeasonBase {
    "@type": "RadioSeason";
}
/** Season dedicated to radio broadcast and associated online delivery. */
export type RadioSeason = RadioSeasonLeaf;
interface RadioSeriesBase extends CreativeWorkSeriesBase {
    /** An actor (individual or a group), e.g. in TV, radio, movie, video games etc., or in an event. Actors can be associated with individual items or with a series, episode, clip. */
    "actor"?: SchemaValue<PerformingGroup | Person | IdReference, "actor">;
    /**
     * An actor, e.g. in TV, radio, movie, video games etc. Actors can be associated with individual items or with a series, episode, clip.
     *
     * @deprecated Consider using https://schema.org/actor instead.
     */
    "actors"?: SchemaValue<Person | IdReference, "actors">;
    /** A season that is part of the media series. */
    "containsSeason"?: SchemaValue<CreativeWorkSeason | IdReference, "containsSeason">;
    /** A director of e.g. TV, radio, movie, video gaming etc. content, or of an event. Directors can be associated with individual items or with a series, episode, clip. */
    "director"?: SchemaValue<Person | IdReference, "director">;
    /**
     * A director of e.g. TV, radio, movie, video games etc. content. Directors can be associated with individual items or with a series, episode, clip.
     *
     * @deprecated Consider using https://schema.org/director instead.
     */
    "directors"?: SchemaValue<Person | IdReference, "directors">;
    /** An episode of a TV, radio or game media within a series or season. */
    "episode"?: SchemaValue<Episode | IdReference, "episode">;
    /**
     * An episode of a TV/radio series or season.
     *
     * @deprecated Consider using https://schema.org/episode instead.
     */
    "episodes"?: SchemaValue<Episode | IdReference, "episodes">;
    /** The composer of the soundtrack. */
    "musicBy"?: SchemaValue<MusicGroup | Person | IdReference, "musicBy">;
    /** The number of episodes in this season or series. */
    "numberOfEpisodes"?: SchemaValue<Integer, "numberOfEpisodes">;
    /** The number of seasons in this series. */
    "numberOfSeasons"?: SchemaValue<Integer, "numberOfSeasons">;
    /** The production company or studio responsible for the item, e.g. series, video game, episode etc. */
    "productionCompany"?: SchemaValue<Organization | IdReference, "productionCompany">;
    /**
     * A season in a media series.
     *
     * @deprecated Consider using https://schema.org/containsSeason instead.
     */
    "season"?: SchemaValue<CreativeWorkSeason | URL | IdReference, "season">;
    /**
     * A season in a media series.
     *
     * @deprecated Consider using https://schema.org/season instead.
     */
    "seasons"?: SchemaValue<CreativeWorkSeason | IdReference, "seasons">;
    /** The trailer of a movie or TV/radio series, season, episode, etc. */
    "trailer"?: SchemaValue<VideoObject | IdReference, "trailer">;
}
interface RadioSeriesLeaf extends RadioSeriesBase {
    "@type": "RadioSeries";
}
/** CreativeWorkSeries dedicated to radio broadcast and associated online delivery. */
export type RadioSeries = RadioSeriesLeaf;
interface RadioStationLeaf extends LocalBusinessBase {
    "@type": "RadioStation";
}
/** A radio station. */
export type RadioStation = RadioStationLeaf | string;
interface RatingBase extends ThingBase {
    /** The author of this content or rating. Please note that author is special in that HTML 5 provides a special mechanism for indicating authorship via the rel tag. That is equivalent to this and may be used interchangeably. */
    "author"?: SchemaValue<Organization | Person | IdReference, "author">;
    /** The highest value allowed in this rating system. */
    "bestRating"?: SchemaValue<Number | Text, "bestRating">;
    /** A short explanation (e.g. one to two sentences) providing background context and other information that led to the conclusion expressed in the rating. This is particularly applicable to ratings associated with "fact check" markup using {@link https://schema.org/ClaimReview ClaimReview}. */
    "ratingExplanation"?: SchemaValue<Text, "ratingExplanation">;
    /**
     * The rating for the content.
     *
     * Usage guidelines:
     * - Use values from 0123456789 (Unicode 'DIGIT ZERO' (U+0030) to 'DIGIT NINE' (U+0039)) rather than superficially similar Unicode symbols.
     * - Use '.' (Unicode 'FULL STOP' (U+002E)) rather than ',' to indicate a decimal point. Avoid using these symbols as a readability separator.
     */
    "ratingValue"?: SchemaValue<Number | Text, "ratingValue">;
    /** This Review or Rating is relevant to this part or facet of the itemReviewed. */
    "reviewAspect"?: SchemaValue<Text, "reviewAspect">;
    /** The lowest value allowed in this rating system. */
    "worstRating"?: SchemaValue<Number | Text, "worstRating">;
}
interface RatingLeaf extends RatingBase {
    "@type": "Rating";
}
/** A rating is an evaluation on a numeric scale, such as 1 to 5 stars. */
export type Rating = RatingLeaf | AggregateRating | EndorsementRating;
interface ReactActionLeaf extends ActionBase {
    "@type": "ReactAction";
}
/** The act of responding instinctively and emotionally to an object, expressing a sentiment. */
export type ReactAction = ReactActionLeaf | AgreeAction | DisagreeAction | DislikeAction | EndorseAction | LikeAction | WantAction;
interface ReadActionLeaf extends ConsumeActionBase {
    "@type": "ReadAction";
}
/** The act of consuming written content. */
export type ReadAction = ReadActionLeaf;
interface RealEstateAgentLeaf extends LocalBusinessBase {
    "@type": "RealEstateAgent";
}
/** A real-estate agent. */
export type RealEstateAgent = RealEstateAgentLeaf | string;
interface RealEstateListingBase extends WebPageBase {
    /** Publication date of an online listing. */
    "datePosted"?: SchemaValue<Date | DateTime, "datePosted">;
    /** Length of the lease for some {@link https://schema.org/Accommodation Accommodation}, either particular to some {@link https://schema.org/Offer Offer} or in some cases intrinsic to the property. */
    "leaseLength"?: SchemaValue<Duration | QuantitativeValue | IdReference, "leaseLength">;
}
interface RealEstateListingLeaf extends RealEstateListingBase {
    "@type": "RealEstateListing";
}
/** A {@link https://schema.org/RealEstateListing RealEstateListing} is a listing that describes one or more real-estate {@link https://schema.org/Offer Offer}s (whose {@link https://schema.org/businessFunction businessFunction} is typically to lease out, or to sell). The {@link https://schema.org/RealEstateListing RealEstateListing} type itself represents the overall listing, as manifested in some {@link https://schema.org/WebPage WebPage}. */
export type RealEstateListing = RealEstateListingLeaf;
interface ReceiveActionBase extends TransferActionBase {
    /** A sub property of instrument. The method of delivery. */
    "deliveryMethod"?: SchemaValue<DeliveryMethod | IdReference, "deliveryMethod">;
    /** A sub property of participant. The participant who is at the sending end of the action. */
    "sender"?: SchemaValue<Audience | Organization | Person | IdReference, "sender">;
}
interface ReceiveActionLeaf extends ReceiveActionBase {
    "@type": "ReceiveAction";
}
/**
 * The act of physically/electronically taking delivery of an object that has been transferred from an origin to a destination. Reciprocal of SendAction.
 *
 * Related actions:
 * - {@link https://schema.org/SendAction SendAction}: The reciprocal of ReceiveAction.
 * - {@link https://schema.org/TakeAction TakeAction}: Unlike TakeAction, ReceiveAction does not imply that the ownership has been transferred (e.g. I can receive a package, but it does not mean the package is now mine).
 */
export type ReceiveAction = ReceiveActionLeaf;
interface RecipeBase extends HowToBase {
    /** The method of cooking, such as Frying, Steaming, ... */
    "cookingMethod"?: SchemaValue<Text, "cookingMethod">;
    /** The time it takes to actually cook the dish, in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 duration format}. */
    "cookTime"?: SchemaValue<Duration | IdReference, "cookTime">;
    /**
     * A single ingredient used in the recipe, e.g. sugar, flour or garlic.
     *
     * @deprecated Consider using https://schema.org/recipeIngredient instead.
     */
    "ingredients"?: SchemaValue<Text, "ingredients">;
    /** Nutrition information about the recipe or menu item. */
    "nutrition"?: SchemaValue<NutritionInformation | IdReference, "nutrition">;
    /** The category of the recipe—for example, appetizer, entree, etc. */
    "recipeCategory"?: SchemaValue<Text, "recipeCategory">;
    /** The cuisine of the recipe (for example, French or Ethiopian). */
    "recipeCuisine"?: SchemaValue<Text, "recipeCuisine">;
    /** A single ingredient used in the recipe, e.g. sugar, flour or garlic. */
    "recipeIngredient"?: SchemaValue<Text, "recipeIngredient">;
    /** A step in making the recipe, in the form of a single item (document, video, etc.) or an ordered list with HowToStep and/or HowToSection items. */
    "recipeInstructions"?: SchemaValue<CreativeWork | ItemList | Text | IdReference, "recipeInstructions">;
    /** The quantity produced by the recipe (for example, number of people served, number of servings, etc). */
    "recipeYield"?: SchemaValue<QuantitativeValue | Text | IdReference, "recipeYield">;
    /** Indicates a dietary restriction or guideline for which this recipe or menu item is suitable, e.g. diabetic, halal etc. */
    "suitableForDiet"?: SchemaValue<RestrictedDiet | IdReference, "suitableForDiet">;
}
interface RecipeLeaf extends RecipeBase {
    "@type": "Recipe";
}
/** A recipe. For dietary restrictions covered by the recipe, a few common restrictions are enumerated via {@link https://schema.org/suitableForDiet suitableForDiet}. The {@link https://schema.org/keywords keywords} property can also be used to add more detail. */
export type Recipe = RecipeLeaf;
interface RecommendationBase extends ReviewBase {
    /** A category for the item. Greater signs or slashes can be used to informally indicate a category hierarchy. */
    "category"?: SchemaValue<CategoryCode | PhysicalActivityCategory | Text | Thing | URL | IdReference, "category">;
}
interface RecommendationLeaf extends RecommendationBase {
    "@type": "Recommendation";
}
/** {@link https://schema.org/Recommendation Recommendation} is a type of {@link https://schema.org/Review Review} that suggests or proposes something as the best option or best course of action. Recommendations may be for products or services, or other concrete things, as in the case of a ranked list or product guide. A {@link https://schema.org/Guide Guide} may list multiple recommendations for different categories. For example, in a {@link https://schema.org/Guide Guide} about which TVs to buy, the author may have several {@link https://schema.org/Recommendation Recommendation}s. */
export type Recommendation = RecommendationLeaf;
interface RecommendedDoseScheduleLeaf extends DoseScheduleBase {
    "@type": "RecommendedDoseSchedule";
}
/** A recommended dosing schedule for a drug or supplement as prescribed or recommended by an authority or by the drug/supplement's manufacturer. Capture the recommending authority in the recognizingAuthority property of MedicalEntity. */
export type RecommendedDoseSchedule = RecommendedDoseScheduleLeaf;
interface RecyclingCenterLeaf extends LocalBusinessBase {
    "@type": "RecyclingCenter";
}
/** A recycling center. */
export type RecyclingCenter = RecyclingCenterLeaf | string;
interface RefundTypeEnumerationLeaf extends EnumerationBase {
    "@type": "RefundTypeEnumeration";
}
/** Enumerates several kinds of product return refund types. */
export type RefundTypeEnumeration = "https://schema.org/ExchangeRefund" | "ExchangeRefund" | "https://schema.org/FullRefund" | "FullRefund" | "https://schema.org/StoreCreditRefund" | "StoreCreditRefund" | RefundTypeEnumerationLeaf;
interface RegisterActionLeaf extends ActionBase {
    "@type": "RegisterAction";
}
/**
 * The act of registering to be a user of a service, product or web page.
 *
 * Related actions:
 * - {@link https://schema.org/JoinAction JoinAction}: Unlike JoinAction, RegisterAction implies you are registering to be a user of a service, _not_ a group/team of people.
 * - {@link https://schema.org/FollowAction FollowAction}: Unlike FollowAction, RegisterAction doesn't imply that the agent is expecting to poll for updates from the object.
 * - {@link https://schema.org/SubscribeAction SubscribeAction}: Unlike SubscribeAction, RegisterAction doesn't imply that the agent is expecting updates from the object.
 */
export type RegisterAction = RegisterActionLeaf;
interface RejectActionLeaf extends ActionBase {
    "@type": "RejectAction";
}
/**
 * The act of rejecting to/adopting an object.
 *
 * Related actions:
 * - {@link https://schema.org/AcceptAction AcceptAction}: The antonym of RejectAction.
 */
export type RejectAction = RejectActionLeaf;
interface RentActionBase extends TradeActionBase {
    /** A sub property of participant. The owner of the real estate property. */
    "landlord"?: SchemaValue<Organization | Person | IdReference, "landlord">;
    /** A sub property of participant. The real estate agent involved in the action. */
    "realEstateAgent"?: SchemaValue<RealEstateAgent | IdReference, "realEstateAgent">;
}
interface RentActionLeaf extends RentActionBase {
    "@type": "RentAction";
}
/** The act of giving money in return for temporary use, but not ownership, of an object such as a vehicle or property. For example, an agent rents a property from a landlord in exchange for a periodic payment. */
export type RentAction = RentActionLeaf;
interface RentalCarReservationBase extends ReservationBase {
    /** Where a rental car can be dropped off. */
    "dropoffLocation"?: SchemaValue<Place | IdReference, "dropoffLocation">;
    /** When a rental car can be dropped off. */
    "dropoffTime"?: SchemaValue<DateTime, "dropoffTime">;
    /** Where a taxi will pick up a passenger or a rental car can be picked up. */
    "pickupLocation"?: SchemaValue<Place | IdReference, "pickupLocation">;
    /** When a taxi will pick up a passenger or a rental car can be picked up. */
    "pickupTime"?: SchemaValue<DateTime, "pickupTime">;
}
interface RentalCarReservationLeaf extends RentalCarReservationBase {
    "@type": "RentalCarReservation";
}
/**
 * A reservation for a rental car.
 *
 * Note: This type is for information about actual reservations, e.g. in confirmation emails or HTML pages with individual confirmations of reservations.
 */
export type RentalCarReservation = RentalCarReservationLeaf;
interface RepaymentSpecificationBase extends ThingBase {
    /** a type of payment made in cash during the onset of the purchase of an expensive good/service. The payment typically represents only a percentage of the full purchase price. */
    "downPayment"?: SchemaValue<MonetaryAmount | Number | IdReference, "downPayment">;
    /** The amount to be paid as a penalty in the event of early payment of the loan. */
    "earlyPrepaymentPenalty"?: SchemaValue<MonetaryAmount | IdReference, "earlyPrepaymentPenalty">;
    /** The amount of money to pay in a single payment. */
    "loanPaymentAmount"?: SchemaValue<MonetaryAmount | IdReference, "loanPaymentAmount">;
    /** Frequency of payments due, i.e. number of months between payments. This is defined as a frequency, i.e. the reciprocal of a period of time. */
    "loanPaymentFrequency"?: SchemaValue<Number, "loanPaymentFrequency">;
    /** The number of payments contractually required at origination to repay the loan. For monthly paying loans this is the number of months from the contractual first payment date to the maturity date. */
    "numberOfLoanPayments"?: SchemaValue<Number, "numberOfLoanPayments">;
}
interface RepaymentSpecificationLeaf extends RepaymentSpecificationBase {
    "@type": "RepaymentSpecification";
}
/** A structured value representing repayment. */
export type RepaymentSpecification = RepaymentSpecificationLeaf;
interface ReplaceActionBase extends UpdateActionBase {
    /** A sub property of object. The object that is being replaced. */
    "replacee"?: SchemaValue<Thing | IdReference, "replacee">;
    /** A sub property of object. The object that replaces. */
    "replacer"?: SchemaValue<Thing | IdReference, "replacer">;
}
interface ReplaceActionLeaf extends ReplaceActionBase {
    "@type": "ReplaceAction";
}
/** The act of editing a recipient by replacing an old object with a new object. */
export type ReplaceAction = ReplaceActionLeaf;
interface ReplyActionBase extends CommunicateActionBase {
    /** A sub property of result. The Comment created or sent as a result of this action. */
    "resultComment"?: SchemaValue<Comment | IdReference, "resultComment">;
}
interface ReplyActionLeaf extends ReplyActionBase {
    "@type": "ReplyAction";
}
/**
 * The act of responding to a question/message asked/sent by the object. Related to {@link https://schema.org/AskAction AskAction}.
 *
 * Related actions:
 * - {@link https://schema.org/AskAction AskAction}: Appears generally as an origin of a ReplyAction.
 */
export type ReplyAction = ReplyActionLeaf;
interface ReportBase extends ArticleBase {
    /** The number or other unique designator assigned to a Report by the publishing organization. */
    "reportNumber"?: SchemaValue<Text, "reportNumber">;
}
interface ReportLeaf extends ReportBase {
    "@type": "Report";
}
/** A Report generated by governmental or non-governmental organization. */
export type Report = ReportLeaf;
interface ReportageNewsArticleLeaf extends NewsArticleBase {
    "@type": "ReportageNewsArticle";
}
/**
 * The {@link https://schema.org/ReportageNewsArticle ReportageNewsArticle} type is a subtype of {@link https://schema.org/NewsArticle NewsArticle} representing news articles which are the result of journalistic news reporting conventions.
 *
 * In practice many news publishers produce a wide variety of article types, many of which might be considered a {@link https://schema.org/NewsArticle NewsArticle} but not a {@link https://schema.org/ReportageNewsArticle ReportageNewsArticle}. For example, opinion pieces, reviews, analysis, sponsored or satirical articles, or articles that combine several of these elements.
 *
 * The {@link https://schema.org/ReportageNewsArticle ReportageNewsArticle} type is based on a stricter ideal for "news" as a work of journalism, with articles based on factual information either observed or verified by the author, or reported and verified from knowledgeable sources. This often includes perspectives from multiple viewpoints on a particular issue (distinguishing news reports from public relations or propaganda). News reports in the {@link https://schema.org/ReportageNewsArticle ReportageNewsArticle} sense de-emphasize the opinion of the author, with commentary and value judgements typically expressed elsewhere.
 *
 * A {@link https://schema.org/ReportageNewsArticle ReportageNewsArticle} which goes deeper into analysis can also be marked with an additional type of {@link https://schema.org/AnalysisNewsArticle AnalysisNewsArticle}.
 */
export type ReportageNewsArticle = ReportageNewsArticleLeaf;
interface ReportedDoseScheduleLeaf extends DoseScheduleBase {
    "@type": "ReportedDoseSchedule";
}
/** A patient-reported or observed dosing schedule for a drug or supplement. */
export type ReportedDoseSchedule = ReportedDoseScheduleLeaf;
interface ResearcherLeaf extends AudienceBase {
    "@type": "Researcher";
}
/** Researchers. */
export type Researcher = ResearcherLeaf;
interface ResearchOrganizationLeaf extends OrganizationBase {
    "@type": "ResearchOrganization";
}
/** A Research Organization (e.g. scientific institute, research company). */
export type ResearchOrganization = ResearchOrganizationLeaf | string;
interface ResearchProjectLeaf extends OrganizationBase {
    "@type": "ResearchProject";
}
/** A Research project. */
export type ResearchProject = ResearchProjectLeaf | string;
interface ReservationBase extends ThingBase {
    /**
     * 'bookingAgent' is an out-dated term indicating a 'broker' that serves as a booking agent.
     *
     * @deprecated Consider using https://schema.org/broker instead.
     */
    "bookingAgent"?: SchemaValue<Organization | Person | IdReference, "bookingAgent">;
    /** The date and time the reservation was booked. */
    "bookingTime"?: SchemaValue<DateTime, "bookingTime">;
    /** An entity that arranges for an exchange between a buyer and a seller. In most cases a broker never acquires or releases ownership of a product or service involved in an exchange. If it is not clear whether an entity is a broker, seller, or buyer, the latter two terms are preferred. */
    "broker"?: SchemaValue<Organization | Person | IdReference, "broker">;
    /** The date and time the reservation was modified. */
    "modifiedTime"?: SchemaValue<DateTime, "modifiedTime">;
    /**
     * The currency of the price, or a price component when attached to {@link https://schema.org/PriceSpecification PriceSpecification} and its subtypes.
     *
     * Use standard formats: {@link http://en.wikipedia.org/wiki/ISO_4217 ISO 4217 currency format}, e.g. "USD"; {@link https://en.wikipedia.org/wiki/List_of_cryptocurrencies Ticker symbol} for cryptocurrencies, e.g. "BTC"; well known names for {@link https://en.wikipedia.org/wiki/Local_exchange_trading_system Local Exchange Trading Systems} (LETS) and other currency types, e.g. "Ithaca HOUR".
     */
    "priceCurrency"?: SchemaValue<Text, "priceCurrency">;
    /** Any membership in a frequent flyer, hotel loyalty program, etc. being applied to the reservation. */
    "programMembershipUsed"?: SchemaValue<ProgramMembership | IdReference, "programMembershipUsed">;
    /** The service provider, service operator, or service performer; the goods producer. Another party (a seller) may offer those services or goods on behalf of the provider. A provider may also serve as the seller. */
    "provider"?: SchemaValue<Organization | Person | IdReference, "provider">;
    /** The thing -- flight, event, restaurant, etc. being reserved. */
    "reservationFor"?: SchemaValue<Thing | IdReference, "reservationFor">;
    /** A unique identifier for the reservation. */
    "reservationId"?: SchemaValue<Text, "reservationId">;
    /** The current status of the reservation. */
    "reservationStatus"?: SchemaValue<ReservationStatusType | IdReference, "reservationStatus">;
    /** A ticket associated with the reservation. */
    "reservedTicket"?: SchemaValue<Ticket | IdReference, "reservedTicket">;
    /**
     * The total price for the reservation or ticket, including applicable taxes, shipping, etc.
     *
     * Usage guidelines:
     * - Use values from 0123456789 (Unicode 'DIGIT ZERO' (U+0030) to 'DIGIT NINE' (U+0039)) rather than superficially similar Unicode symbols.
     * - Use '.' (Unicode 'FULL STOP' (U+002E)) rather than ',' to indicate a decimal point. Avoid using these symbols as a readability separator.
     */
    "totalPrice"?: SchemaValue<Number | PriceSpecification | Text | IdReference, "totalPrice">;
    /** The person or organization the reservation or ticket is for. */
    "underName"?: SchemaValue<Organization | Person | IdReference, "underName">;
}
interface ReservationLeaf extends ReservationBase {
    "@type": "Reservation";
}
/**
 * Describes a reservation for travel, dining or an event. Some reservations require tickets.
 *
 * Note: This type is for information about actual reservations, e.g. in confirmation emails or HTML pages with individual confirmations of reservations. For offers of tickets, restaurant reservations, flights, or rental cars, use {@link https://schema.org/Offer Offer}.
 */
export type Reservation = ReservationLeaf | BoatReservation | BusReservation | EventReservation | FlightReservation | FoodEstablishmentReservation | LodgingReservation | RentalCarReservation | ReservationPackage | TaxiReservation | TrainReservation;
interface ReservationPackageBase extends ReservationBase {
    /** The individual reservations included in the package. Typically a repeated property. */
    "subReservation"?: SchemaValue<Reservation | IdReference, "subReservation">;
}
interface ReservationPackageLeaf extends ReservationPackageBase {
    "@type": "ReservationPackage";
}
/** A group of multiple reservations with common values for all sub-reservations. */
export type ReservationPackage = ReservationPackageLeaf;
interface ReservationStatusTypeLeaf extends EnumerationBase {
    "@type": "ReservationStatusType";
}
/** Enumerated status values for Reservation. */
export type ReservationStatusType = "https://schema.org/ReservationCancelled" | "ReservationCancelled" | "https://schema.org/ReservationConfirmed" | "ReservationConfirmed" | "https://schema.org/ReservationHold" | "ReservationHold" | "https://schema.org/ReservationPending" | "ReservationPending" | ReservationStatusTypeLeaf;
interface ReserveActionLeaf extends PlanActionBase {
    "@type": "ReserveAction";
}
/**
 * Reserving a concrete object.
 *
 * Related actions:
 * - {@link https://schema.org/ScheduleAction ScheduleAction}: Unlike ScheduleAction, ReserveAction reserves concrete objects (e.g. a table, a hotel) towards a time slot / spatial allocation.
 */
export type ReserveAction = ReserveActionLeaf;
interface ReservoirLeaf extends PlaceBase {
    "@type": "Reservoir";
}
/** A reservoir of water, typically an artificially created lake, like the Lake Kariba reservoir. */
export type Reservoir = ReservoirLeaf | string;
interface ResidenceBase extends PlaceBase {
    /** A floorplan of some {@link https://schema.org/Accommodation Accommodation}. */
    "accommodationFloorPlan"?: SchemaValue<FloorPlan | IdReference, "accommodationFloorPlan">;
}
interface ResidenceLeaf extends ResidenceBase {
    "@type": "Residence";
}
/** The place where a person lives. */
export type Residence = ResidenceLeaf | ApartmentComplex | GatedResidenceCommunity | string;
interface ResortLeaf extends LodgingBusinessBase {
    "@type": "Resort";
}
/**
 * A resort is a place used for relaxation or recreation, attracting visitors for holidays or vacations. Resorts are places, towns or sometimes commercial establishments operated by a single company (source: Wikipedia, the free encyclopedia, see {@link http://en.wikipedia.org/wiki/Resort http://en.wikipedia.org/wiki/Resort}).
 *
 * See also the {@link /docs/hotels.html dedicated document on the use of schema.org for marking up hotels and other forms of accommodations}.
 */
export type Resort = ResortLeaf | SkiResort | string;
interface RespiratoryTherapyLeaf extends MedicalTherapyBase {
    "@type": "RespiratoryTherapy";
}
/** The therapy that is concerned with the maintenance or improvement of respiratory function (as in patients with pulmonary disease). */
export type RespiratoryTherapy = RespiratoryTherapyLeaf;
interface RestaurantLeaf extends FoodEstablishmentBase {
    "@type": "Restaurant";
}
/** A restaurant. */
export type Restaurant = RestaurantLeaf | string;
interface RestrictedDietLeaf extends EnumerationBase {
    "@type": "RestrictedDiet";
}
/** A diet restricted to certain foods or preparations for cultural, religious, health or lifestyle reasons. */
export type RestrictedDiet = "https://schema.org/DiabeticDiet" | "DiabeticDiet" | "https://schema.org/GlutenFreeDiet" | "GlutenFreeDiet" | "https://schema.org/HalalDiet" | "HalalDiet" | "https://schema.org/HinduDiet" | "HinduDiet" | "https://schema.org/KosherDiet" | "KosherDiet" | "https://schema.org/LowCalorieDiet" | "LowCalorieDiet" | "https://schema.org/LowFatDiet" | "LowFatDiet" | "https://schema.org/LowLactoseDiet" | "LowLactoseDiet" | "https://schema.org/LowSaltDiet" | "LowSaltDiet" | "https://schema.org/VeganDiet" | "VeganDiet" | "https://schema.org/VegetarianDiet" | "VegetarianDiet" | RestrictedDietLeaf;
interface ResumeActionLeaf extends ActionBase {
    "@type": "ResumeAction";
}
/** The act of resuming a device or application which was formerly paused (e.g. resume music playback or resume a timer). */
export type ResumeAction = ResumeActionLeaf;
interface ReturnActionBase extends TransferActionBase {
    /** A sub property of participant. The participant who is at the receiving end of the action. */
    "recipient"?: SchemaValue<Audience | ContactPoint | Organization | Person | IdReference, "recipient">;
}
interface ReturnActionLeaf extends ReturnActionBase {
    "@type": "ReturnAction";
}
/** The act of returning to the origin that which was previously received (concrete objects) or taken (ownership). */
export type ReturnAction = ReturnActionLeaf;
interface ReturnFeesEnumerationLeaf extends EnumerationBase {
    "@type": "ReturnFeesEnumeration";
}
/** Enumerates several kinds of policies for product return fees. */
export type ReturnFeesEnumeration = "https://schema.org/FreeReturn" | "FreeReturn" | "https://schema.org/OriginalShippingFees" | "OriginalShippingFees" | "https://schema.org/RestockingFees" | "RestockingFees" | "https://schema.org/ReturnFeesCustomerResponsibility" | "ReturnFeesCustomerResponsibility" | "https://schema.org/ReturnShippingFees" | "ReturnShippingFees" | ReturnFeesEnumerationLeaf;
interface ReturnLabelSourceEnumerationLeaf extends EnumerationBase {
    "@type": "ReturnLabelSourceEnumeration";
}
/** Enumerates several types of return labels for product returns. */
export type ReturnLabelSourceEnumeration = "https://schema.org/ReturnLabelCustomerResponsibility" | "ReturnLabelCustomerResponsibility" | "https://schema.org/ReturnLabelDownloadAndPrint" | "ReturnLabelDownloadAndPrint" | "https://schema.org/ReturnLabelInBox" | "ReturnLabelInBox" | ReturnLabelSourceEnumerationLeaf;
interface ReturnMethodEnumerationLeaf extends EnumerationBase {
    "@type": "ReturnMethodEnumeration";
}
/** Enumerates several types of product return methods. */
export type ReturnMethodEnumeration = "https://schema.org/KeepProduct" | "KeepProduct" | "https://schema.org/ReturnAtKiosk" | "ReturnAtKiosk" | "https://schema.org/ReturnByMail" | "ReturnByMail" | "https://schema.org/ReturnInStore" | "ReturnInStore" | ReturnMethodEnumerationLeaf;
interface ReviewBase extends CreativeWorkBase {
    /** An associated {@link https://schema.org/ClaimReview ClaimReview}, related by specific common content, topic or claim. The expectation is that this property would be most typically used in cases where a single activity is conducting both claim reviews and media reviews, in which case {@link https://schema.org/relatedMediaReview relatedMediaReview} would commonly be used on a {@link https://schema.org/ClaimReview ClaimReview}, while {@link https://schema.org/relatedClaimReview relatedClaimReview} would be used on {@link https://schema.org/MediaReview MediaReview}. */
    "associatedClaimReview"?: SchemaValue<Review | IdReference, "associatedClaimReview">;
    /** An associated {@link https://schema.org/MediaReview MediaReview}, related by specific common content, topic or claim. The expectation is that this property would be most typically used in cases where a single activity is conducting both claim reviews and media reviews, in which case {@link https://schema.org/relatedMediaReview relatedMediaReview} would commonly be used on a {@link https://schema.org/ClaimReview ClaimReview}, while {@link https://schema.org/relatedClaimReview relatedClaimReview} would be used on {@link https://schema.org/MediaReview MediaReview}. */
    "associatedMediaReview"?: SchemaValue<Review | IdReference, "associatedMediaReview">;
    /** An associated {@link https://schema.org/Review Review}. */
    "associatedReview"?: SchemaValue<Review | IdReference, "associatedReview">;
    /** The item that is being reviewed/rated. */
    "itemReviewed"?: SchemaValue<Thing | IdReference, "itemReviewed">;
    /**
     * Provides negative considerations regarding something, most typically in pro/con lists for reviews (alongside {@link https://schema.org/positiveNotes positiveNotes}). For symmetry
     *
     * In the case of a {@link https://schema.org/Review Review}, the property describes the {@link https://schema.org/itemReviewed itemReviewed} from the perspective of the review; in the case of a {@link https://schema.org/Product Product}, the product itself is being described. Since product descriptions tend to emphasise positive claims, it may be relatively unusual to find {@link https://schema.org/negativeNotes negativeNotes} used in this way. Nevertheless for the sake of symmetry, {@link https://schema.org/negativeNotes negativeNotes} can be used on {@link https://schema.org/Product Product}.
     *
     * The property values can be expressed either as unstructured text (repeated as necessary), or if ordered, as a list (in which case the most negative is at the beginning of the list).
     */
    "negativeNotes"?: SchemaValue<ItemList | ListItem | Text | WebContent | IdReference, "negativeNotes">;
    /**
     * Provides positive considerations regarding something, for example product highlights or (alongside {@link https://schema.org/negativeNotes negativeNotes}) pro/con lists for reviews.
     *
     * In the case of a {@link https://schema.org/Review Review}, the property describes the {@link https://schema.org/itemReviewed itemReviewed} from the perspective of the review; in the case of a {@link https://schema.org/Product Product}, the product itself is being described.
     *
     * The property values can be expressed either as unstructured text (repeated as necessary), or if ordered, as a list (in which case the most positive is at the beginning of the list).
     */
    "positiveNotes"?: SchemaValue<ItemList | ListItem | Text | WebContent | IdReference, "positiveNotes">;
    /** This Review or Rating is relevant to this part or facet of the itemReviewed. */
    "reviewAspect"?: SchemaValue<Text, "reviewAspect">;
    /** The actual body of the review. */
    "reviewBody"?: SchemaValue<Text, "reviewBody">;
    /** The rating given in this review. Note that reviews can themselves be rated. The `reviewRating` applies to rating given by the review. The {@link https://schema.org/aggregateRating aggregateRating} property applies to the review itself, as a creative work. */
    "reviewRating"?: SchemaValue<Rating | IdReference, "reviewRating">;
}
interface ReviewLeaf extends ReviewBase {
    "@type": "Review";
}
/** A review of an item - for example, of a restaurant, movie, or store. */
export type Review = ReviewLeaf | ClaimReview | CriticReview | EmployerReview | MediaReview | Recommendation | UserReview;
interface ReviewActionBase extends ActionBase {
    /** A sub property of result. The review that resulted in the performing of the action. */
    "resultReview"?: SchemaValue<Review | IdReference, "resultReview">;
}
interface ReviewActionLeaf extends ReviewActionBase {
    "@type": "ReviewAction";
}
/** The act of producing a balanced opinion about the object for an audience. An agent reviews an object with participants resulting in a review. */
export type ReviewAction = ReviewActionLeaf;
interface ReviewNewsArticleBase extends NewsArticleBase, ReviewBase {
}
interface ReviewNewsArticleLeaf extends ReviewNewsArticleBase {
    "@type": "ReviewNewsArticle";
}
/** A {@link https://schema.org/NewsArticle NewsArticle} and {@link https://schema.org/CriticReview CriticReview} providing a professional critic's assessment of a service, product, performance, or artistic or literary work. */
export type ReviewNewsArticle = ReviewNewsArticleLeaf;
interface RiverBodyOfWaterLeaf extends PlaceBase {
    "@type": "RiverBodyOfWater";
}
/** A river (for example, the broad majestic Shannon). */
export type RiverBodyOfWater = RiverBodyOfWaterLeaf | string;
interface RoofingContractorLeaf extends LocalBusinessBase {
    "@type": "RoofingContractor";
}
/** A roofing contractor. */
export type RoofingContractor = RoofingContractorLeaf | string;
interface RoomLeaf extends AccommodationBase {
    "@type": "Room";
}
/**
 * A room is a distinguishable space within a structure, usually separated from other spaces by interior walls (source: Wikipedia, the free encyclopedia, see {@link http://en.wikipedia.org/wiki/Room http://en.wikipedia.org/wiki/Room}).
 *
 * See also the {@link /docs/hotels.html dedicated document on the use of schema.org for marking up hotels and other forms of accommodations}.
 */
export type Room = RoomLeaf | HotelRoom | MeetingRoom | string;
interface RsvpActionBase extends InformActionBase {
    /** If responding yes, the number of guests who will attend in addition to the invitee. */
    "additionalNumberOfGuests"?: SchemaValue<Number, "additionalNumberOfGuests">;
    /** Comments, typically from users. */
    "comment"?: SchemaValue<Comment | IdReference, "comment">;
    /** The response (yes, no, maybe) to the RSVP. */
    "rsvpResponse"?: SchemaValue<RsvpResponseType | IdReference, "rsvpResponse">;
}
interface RsvpActionLeaf extends RsvpActionBase {
    "@type": "RsvpAction";
}
/** The act of notifying an event organizer as to whether you expect to attend the event. */
export type RsvpAction = RsvpActionLeaf;
interface RsvpResponseTypeLeaf extends EnumerationBase {
    "@type": "RsvpResponseType";
}
/** RsvpResponseType is an enumeration type whose instances represent responding to an RSVP request. */
export type RsvpResponseType = "https://schema.org/RsvpResponseMaybe" | "RsvpResponseMaybe" | "https://schema.org/RsvpResponseNo" | "RsvpResponseNo" | "https://schema.org/RsvpResponseYes" | "RsvpResponseYes" | RsvpResponseTypeLeaf;
interface RVParkLeaf extends CivicStructureBase {
    "@type": "RVPark";
}
/** A place offering space for "Recreational Vehicles", Caravans, mobile homes and the like. */
export type RVPark = RVParkLeaf | string;
interface SaleEventLeaf extends EventBase {
    "@type": "SaleEvent";
}
/** Event type: Sales event. */
export type SaleEvent = SaleEventLeaf;
interface SatiricalArticleLeaf extends ArticleBase {
    "@type": "SatiricalArticle";
}
/** An {@link https://schema.org/Article Article} whose content is primarily {@link https://schema.org/satirical satirical}(https://en.wikipedia.org/wiki/Satire) in nature, i.e. unlikely to be literally true. A satirical article is sometimes but not necessarily also a {@link https://schema.org/NewsArticle NewsArticle}. {@link https://schema.org/ScholarlyArticle ScholarlyArticle}s are also sometimes satirized. */
export type SatiricalArticle = SatiricalArticleLeaf;
interface ScheduleBase extends ThingBase {
    /** Defines the day(s) of the week on which a recurring {@link https://schema.org/Event Event} takes place. May be specified using either {@link https://schema.org/DayOfWeek DayOfWeek}, or alternatively {@link https://schema.org/Text Text} conforming to iCal's syntax for byDay recurrence rules. */
    "byDay"?: SchemaValue<DayOfWeek | Text | IdReference, "byDay">;
    /** Defines the month(s) of the year on which a recurring {@link https://schema.org/Event Event} takes place. Specified as an {@link https://schema.org/Integer Integer} between 1-12. January is 1. */
    "byMonth"?: SchemaValue<Integer, "byMonth">;
    /** Defines the day(s) of the month on which a recurring {@link https://schema.org/Event Event} takes place. Specified as an {@link https://schema.org/Integer Integer} between 1-31. */
    "byMonthDay"?: SchemaValue<Integer, "byMonthDay">;
    /** Defines the week(s) of the month on which a recurring Event takes place. Specified as an Integer between 1-5. For clarity, byMonthWeek is best used in conjunction with byDay to indicate concepts like the first and third Mondays of a month. */
    "byMonthWeek"?: SchemaValue<Integer, "byMonthWeek">;
    /** The duration of the item (movie, audio recording, event, etc.) in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 duration format}. */
    "duration"?: SchemaValue<Duration | IdReference, "duration">;
    /** The end date and time of the item (in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 date format}). */
    "endDate"?: SchemaValue<Date | DateTime, "endDate">;
    /**
     * The endTime of something. For a reserved event or service (e.g. FoodEstablishmentReservation), the time that it is expected to end. For actions that span a period of time, when the action was performed. E.g. John wrote a book from January to _December_. For media, including audio and video, it's the time offset of the end of a clip within a larger file.
     *
     * Note that Event uses startDate/endDate instead of startTime/endTime, even when describing dates with times. This situation may be clarified in future revisions.
     */
    "endTime"?: SchemaValue<DateTime | Time, "endTime">;
    /** Defines a {@link https://schema.org/Date Date} or {@link https://schema.org/DateTime DateTime} during which a scheduled {@link https://schema.org/Event Event} will not take place. The property allows exceptions to a {@link https://schema.org/Schedule Schedule} to be specified. If an exception is specified as a {@link https://schema.org/DateTime DateTime} then only the event that would have started at that specific date and time should be excluded from the schedule. If an exception is specified as a {@link https://schema.org/Date Date} then any event that is scheduled for that 24 hour period should be excluded from the schedule. This allows a whole day to be excluded from the schedule without having to itemise every scheduled event. */
    "exceptDate"?: SchemaValue<Date | DateTime, "exceptDate">;
    /** Defines the number of times a recurring {@link https://schema.org/Event Event} will take place. */
    "repeatCount"?: SchemaValue<Integer, "repeatCount">;
    /** Defines the frequency at which {@link https://schema.org/Event Event}s will occur according to a schedule {@link https://schema.org/Schedule Schedule}. The intervals between events should be defined as a {@link https://schema.org/Duration Duration} of time. */
    "repeatFrequency"?: SchemaValue<Duration | Text | IdReference, "repeatFrequency">;
    /** Indicates the timezone for which the time(s) indicated in the {@link https://schema.org/Schedule Schedule} are given. The value provided should be among those listed in the IANA Time Zone Database. */
    "scheduleTimezone"?: SchemaValue<Text, "scheduleTimezone">;
    /** The start date and time of the item (in {@link http://en.wikipedia.org/wiki/ISO_8601 ISO 8601 date format}). */
    "startDate"?: SchemaValue<Date | DateTime, "startDate">;
    /**
     * The startTime of something. For a reserved event or service (e.g. FoodEstablishmentReservation), the time that it is expected to start. For actions that span a period of time, when the action was performed. E.g. John wrote a book from _January_ to December. For media, including audio and video, it's the time offset of the start of a clip within a larger file.
     *
     * Note that Event uses startDate/endDate instead of startTime/endTime, even when describing dates with times. This situation may be clarified in future revisions.
     */
    "startTime"?: SchemaValue<DateTime | Time, "startTime">;
}
interface ScheduleLeaf extends ScheduleBase {
    "@type": "Schedule";
}
/** A schedule defines a repeating time period used to describe a regularly occurring {@link https://schema.org/Event Event}. At a minimum a schedule will specify {@link https://schema.org/repeatFrequency repeatFrequency} which describes the interval between occurrences of the event. Additional information can be provided to specify the schedule more precisely. This includes identifying the day(s) of the week or month when the recurring event will take place, in addition to its start and end time. Schedules may also have start and end dates to indicate when they are active, e.g. to define a limited calendar of events. */
export type Schedule = ScheduleLeaf;
interface ScheduleActionLeaf extends PlanActionBase {
    "@type": "ScheduleAction";
}
/**
 * Scheduling future actions, events, or tasks.
 *
 * Related actions:
 * - {@link https://schema.org/ReserveAction ReserveAction}: Unlike ReserveAction, ScheduleAction allocates future actions (e.g. an event, a task, etc) towards a time slot / spatial allocation.
 */
export type ScheduleAction = ScheduleActionLeaf;
interface ScholarlyArticleLeaf extends ArticleBase {
    "@type": "ScholarlyArticle";
}
/** A scholarly article. */
export type ScholarlyArticle = ScholarlyArticleLeaf | MedicalScholarlyArticle;
interface SchoolLeaf extends EducationalOrganizationBase {
    "@type": "School";
}
/** A school. */
export type School = SchoolLeaf | string;
interface SchoolDistrictLeaf extends PlaceBase {
    "@type": "SchoolDistrict";
}
/** A School District is an administrative area for the administration of schools. */
export type SchoolDistrict = SchoolDistrictLeaf | string;
interface ScreeningEventBase extends EventBase {
    /** Languages in which subtitles/captions are available, in {@link http://tools.ietf.org/html/bcp47 IETF BCP 47 standard format}. */
    "subtitleLanguage"?: SchemaValue<Language | Text | IdReference, "subtitleLanguage">;
    /** The type of screening or video broadcast used (e.g. IMAX, 3D, SD, HD, etc.). */
    "videoFormat"?: SchemaValue<Text, "videoFormat">;
    /** The movie presented during this event. */
    "workPresented"?: SchemaValue<Movie | IdReference, "workPresented">;
}
interface ScreeningEventLeaf extends ScreeningEventBase {
    "@type": "ScreeningEvent";
}
/** A screening of a movie or other video. */
export type ScreeningEvent = ScreeningEventLeaf;
interface SculptureLeaf extends CreativeWorkBase {
    "@type": "Sculpture";
}
/** A piece of sculpture. */
export type Sculpture = SculptureLeaf;
interface SeaBodyOfWaterLeaf extends PlaceBase {
    "@type": "SeaBodyOfWater";
}
/** A sea (for example, the Caspian sea). */
export type SeaBodyOfWater = SeaBodyOfWaterLeaf | string;
interface SearchActionBase extends ActionBase {
    /** A sub property of instrument. The query used on this action. */
    "query"?: SchemaValue<Text, "query">;
}
interface SearchActionLeaf extends SearchActionBase {
    "@type": "SearchAction";
}
/**
 * The act of searching for an object.
 *
 * Related actions:
 * - {@link https://schema.org/FindAction FindAction}: SearchAction generally leads to a FindAction, but not necessarily.
 */
export type SearchAction = SearchActionLeaf;
interface SearchRescueOrganizationLeaf extends OrganizationBase {
    "@type": "SearchRescueOrganization";
}
/** A Search and Rescue organization of some kind. */
export type SearchRescueOrganization = SearchRescueOrganizationLeaf | string;
interface SearchResultsPageLeaf extends WebPageBase {
    "@type": "SearchResultsPage";
}
/** Web page type: Search results page. */
export type SearchResultsPage = SearchResultsPageLeaf;
interface SeasonLeaf extends CreativeWorkBase {
    "@type": "Season";
}
/**
 * A media season, e.g. TV, radio, video game etc.
 *
 * @deprecated Use CreativeWorkSeason instead.
 */
export type Season = SeasonLeaf;
interface SeatBase extends ThingBase {
    /** The type/class of the seat. */
    "seatingType"?: SchemaValue<QualitativeValue | Text | IdReference, "seatingType">;
    /** The location of the reserved seat (e.g., 27). */
    "seatNumber"?: SchemaValue<Text, "seatNumber">;
    /** The row location of the reserved seat (e.g., B). */
    "seatRow"?: SchemaValue<Text, "seatRow">;
    /** The section location of the reserved seat (e.g. Orchestra). */
    "seatSection"?: SchemaValue<Text, "seatSection">;
}
interface SeatLeaf extends SeatBase {
    "@type": "Seat";
}
/** Used to describe a seat, such as a reserved seat in an event reservation. */
export type Seat = SeatLeaf;
interface SeekToActionBase extends ActionBase {
    /** The start time of the clip expressed as the number of seconds from the beginning of the work. */
    "startOffset"?: SchemaValue<HyperTocEntry | Number | IdReference, "startOffset">;
}
interface SeekToActionLeaf extends SeekToActionBase {
    "@type": "SeekToAction";
}
/** This is the {@link https://schema.org/Action Action} of navigating to a specific {@link https://schema.org/startOffset startOffset} timestamp within a {@link https://schema.org/VideoObject VideoObject}, typically represented with a URL template structure. */
export type SeekToAction = SeekToActionLeaf;
interface SelfStorageLeaf extends LocalBusinessBase {
    "@type": "SelfStorage";
}
/** A self-storage facility. */
export type SelfStorage = SelfStorageLeaf | string;
interface SellActionBase extends TradeActionBase {
    /** A sub property of participant. The participant/person/organization that bought the object. */
    "buyer"?: SchemaValue<Organization | Person | IdReference, "buyer">;
    /**
     * The warranty promise(s) included in the offer.
     *
     * @deprecated Consider using https://schema.org/warranty instead.
     */
    "warrantyPromise"?: SchemaValue<WarrantyPromise | IdReference, "warrantyPromise">;
}
interface SellActionLeaf extends SellActionBase {
    "@type": "SellAction";
}
/** The act of taking money from a buyer in exchange for goods or services rendered. An agent sells an object, product, or service to a buyer for a price. Reciprocal of BuyAction. */
export type SellAction = SellActionLeaf;
interface SendActionBase extends TransferActionBase {
    /** A sub property of instrument. The method of delivery. */
    "deliveryMethod"?: SchemaValue<DeliveryMethod | IdReference, "deliveryMethod">;
    /** A sub property of participant. The participant who is at the receiving end of the action. */
    "recipient"?: SchemaValue<Audience | ContactPoint | Organization | Person | IdReference, "recipient">;
}
interface SendActionLeaf extends SendActionBase {
    "@type": "SendAction";
}
/**
 * The act of physically/electronically dispatching an object for transfer from an origin to a destination. Related actions:
 * - {@link https://schema.org/ReceiveAction ReceiveAction}: The reciprocal of SendAction.
 * - {@link https://schema.org/GiveAction GiveAction}: Unlike GiveAction, SendAction does not imply the transfer of ownership (e.g. I can send you my laptop, but I'm not necessarily giving it to you).
 */
export type SendAction = SendActionLeaf;
interface SeriesLeaf extends ThingBase {
    "@type": "Series";
}
/** A Series in schema.org is a group of related items, typically but not necessarily of the same kind. See also {@link https://schema.org/CreativeWorkSeries CreativeWorkSeries}, {@link https://schema.org/EventSeries EventSeries}. */
export type Series = SeriesLeaf | CreativeWorkSeries | EventSeries;
interface ServiceBase extends ThingBase {
    /** The overall rating, based on a collection of reviews or ratings, of the item. */
    "aggregateRating"?: SchemaValue<AggregateRating | IdReference, "aggregateRating">;
    /** The geographic area where a service or offered item is provided. */
    "areaServed"?: SchemaValue<AdministrativeArea | GeoShape | Place | Text | IdReference, "areaServed">;
    /** An intended audience, i.e. a group for whom something was created. */
    "audience"?: SchemaValue<Audience | IdReference, "audience">;
    /** A means of accessing the service (e.g. a phone bank, a web site, a location, etc.). */
    "availableChannel"?: SchemaValue<ServiceChannel | IdReference, "availableChannel">;
    /** An award won by or for this item. */
    "award"?: SchemaValue<Text, "award">;
    /** The brand(s) associated with a product or service, or the brand(s) maintained by an organization or business person. */
    "brand"?: SchemaValue<Brand | Organization | IdReference, "brand">;
    /** An entity that arranges for an exchange between a buyer and a seller. In most cases a broker never acquires or releases ownership of a product or service involved in an exchange. If it is not clear whether an entity is a broker, seller, or buyer, the latter two terms are preferred. */
    "broker"?: SchemaValue<Organization | Person | IdReference, "broker">;
    /** A category for the item. Greater signs or slashes can be used to informally indicate a category hierarchy. */
    "category"?: SchemaValue<CategoryCode | PhysicalActivityCategory | Text | Thing | URL | IdReference, "category">;
    /** Certification information about a product, organization, service, place, or person. */
    "hasCertification"?: SchemaValue<Certification | IdReference, "hasCertification">;
    /** Indicates an OfferCatalog listing for this Organization, Person, or Service. */
    "hasOfferCatalog"?: SchemaValue<OfferCatalog | IdReference, "hasOfferCatalog">;
    /** The hours during which this service or contact is available. */
    "hoursAvailable"?: SchemaValue<OpeningHoursSpecification | IdReference, "hoursAvailable">;
    /** A pointer to another, somehow related product (or multiple products). */
    "isRelatedTo"?: SchemaValue<Product | Service | IdReference, "isRelatedTo">;
    /** A pointer to another, functionally similar product (or multiple products). */
    "isSimilarTo"?: SchemaValue<Product | Service | IdReference, "isSimilarTo">;
    /** An associated logo. */
    "logo"?: SchemaValue<ImageObject | URL | IdReference, "logo">;
    /** An offer to provide this item—for example, an offer to sell a product, rent the DVD of a movie, perform a service, or give away tickets to an event. Use {@link https://schema.org/businessFunction businessFunction} to indicate the kind of transaction offered, i.e. sell, lease, etc. This property can also be used to describe a {@link https://schema.org/Demand Demand}. While this property is listed as expected on a number of common types, it can be used in others. In that case, using a second type, such as Product or a subtype of Product, can clarify the nature of the offer. */
    "offers"?: SchemaValue<Demand | Offer | IdReference, "offers">;
    /**
     * The tangible thing generated by the service, e.g. a passport, permit, etc.
     *
     * @deprecated Consider using https://schema.org/serviceOutput instead.
     */
    "produces"?: SchemaValue<Thing | IdReference, "produces">;
    /** The service provider, service operator, or service performer; the goods producer. Another party (a seller) may offer those services or goods on behalf of the provider. A provider may also serve as the seller. */
    "provider"?: SchemaValue<Organization | Person | IdReference, "provider">;
    /** Indicates the mobility of a provided service (e.g. 'static', 'dynamic'). */
    "providerMobility"?: SchemaValue<Text, "providerMobility">;
    /** A review of the item. */
    "review"?: SchemaValue<Review | IdReference, "review">;
    /**
     * The geographic area where the service is provided.
     *
     * @deprecated Consider using https://schema.org/areaServed instead.
     */
    "serviceArea"?: SchemaValue<AdministrativeArea | GeoShape | Place | IdReference, "serviceArea">;
    /**
     * The audience eligible for this service.
     *
     * @deprecated Consider using https://schema.org/audience instead.
     */
    "serviceAudience"?: SchemaValue<Audience | IdReference, "serviceAudience">;
    /** The tangible thing generated by the service, e.g. a passport, permit, etc. */
    "serviceOutput"?: SchemaValue<Thing | IdReference, "serviceOutput">;
    /** The type of service being offered, e.g. veterans' benefits, emergency relief, etc. */
    "serviceType"?: SchemaValue<GovernmentBenefitsType | Text | IdReference, "serviceType">;
    /** A slogan or motto associated with the item. */
    "slogan"?: SchemaValue<Text, "slogan">;
    /** Human-readable terms of service documentation. */
    "termsOfService"?: SchemaValue<Text | URL, "termsOfService">;
}
interface ServiceLeaf extends ServiceBase {
    "@type": "Service";
}
/** A service provided by an organization, e.g. delivery service, print services, etc. */
export type Service = ServiceLeaf | BroadcastService | CableOrSatelliteService | FinancialProduct | FoodService | GovernmentService | Taxi | TaxiService | WebAPI;
interface ServiceChannelBase extends ThingBase {
    /** A language someone may use with or at the item, service or place. Please use one of the language codes from the {@link http://tools.ietf.org/html/bcp47 IETF BCP 47 standard}. See also {@link https://schema.org/inLanguage inLanguage}. */
    "availableLanguage"?: SchemaValue<Language | Text | IdReference, "availableLanguage">;
    /** Estimated processing time for the service using this channel. */
    "processingTime"?: SchemaValue<Duration | IdReference, "processingTime">;
    /** The service provided by this channel. */
    "providesService"?: SchemaValue<Service | IdReference, "providesService">;
    /** The location (e.g. civic structure, local business, etc.) where a person can go to access the service. */
    "serviceLocation"?: SchemaValue<Place | IdReference, "serviceLocation">;
    /** The phone number to use to access the service. */
    "servicePhone"?: SchemaValue<ContactPoint | IdReference, "servicePhone">;
    /** The address for accessing the service by mail. */
    "servicePostalAddress"?: SchemaValue<PostalAddress | IdReference, "servicePostalAddress">;
    /** The number to access the service by text message. */
    "serviceSmsNumber"?: SchemaValue<ContactPoint | IdReference, "serviceSmsNumber">;
    /** The website to access the service. */
    "serviceUrl"?: SchemaValue<URL, "serviceUrl">;
}
interface ServiceChannelLeaf extends ServiceChannelBase {
    "@type": "ServiceChannel";
}
/** A means for accessing a service, e.g. a government office location, web site, or phone number. */
export type ServiceChannel = ServiceChannelLeaf;
interface ShareActionLeaf extends CommunicateActionBase {
    "@type": "ShareAction";
}
/** The act of distributing content to people for their amusement or edification. */
export type ShareAction = ShareActionLeaf;
interface SheetMusicLeaf extends CreativeWorkBase {
    "@type": "SheetMusic";
}
/** Printed music, as opposed to performed or recorded music. */
export type SheetMusic = SheetMusicLeaf;
interface ShippingDeliveryTimeBase extends ThingBase {
    /** Days of the week when the merchant typically operates, indicated via opening hours markup. */
    "businessDays"?: SchemaValue<OpeningHoursSpecification | IdReference, "businessDays">;
    /** Order cutoff time allows merchants to describe the time after which they will no longer process orders received on that day. For orders processed after cutoff time, one day gets added to the delivery time estimate. This property is expected to be most typically used via the {@link https://schema.org/ShippingRateSettings ShippingRateSettings} publication pattern. The time is indicated using the ISO-8601 Time format, e.g. "23:30:00-05:00" would represent 6:30 pm Eastern Standard Time (EST) which is 5 hours behind Coordinated Universal Time (UTC). */
    "cutoffTime"?: SchemaValue<Time, "cutoffTime">;
    /** The typical delay between the receipt of the order and the goods either leaving the warehouse or being prepared for pickup, in case the delivery method is on site pickup. Typical properties: minValue, maxValue, unitCode (d for DAY). This is by common convention assumed to mean business days (if a unitCode is used, coded as "d"), i.e. only counting days when the business normally operates. */
    "handlingTime"?: SchemaValue<QuantitativeValue | IdReference, "handlingTime">;
    /** The typical delay the order has been sent for delivery and the goods reach the final customer. Typical properties: minValue, maxValue, unitCode (d for DAY). */
    "transitTime"?: SchemaValue<QuantitativeValue | IdReference, "transitTime">;
}
interface ShippingDeliveryTimeLeaf extends ShippingDeliveryTimeBase {
    "@type": "ShippingDeliveryTime";
}
/** ShippingDeliveryTime provides various pieces of information about delivery times for shipping. */
export type ShippingDeliveryTime = ShippingDeliveryTimeLeaf;
interface ShippingRateSettingsBase extends ThingBase {
    /** Indicates when shipping to a particular {@link https://schema.org/shippingDestination shippingDestination} is not available. */
    "doesNotShip"?: SchemaValue<Boolean, "doesNotShip">;
    /** A monetary value above (or at) which the shipping rate becomes free. Intended to be used via an {@link https://schema.org/OfferShippingDetails OfferShippingDetails} with {@link https://schema.org/shippingSettingsLink shippingSettingsLink} matching this {@link https://schema.org/ShippingRateSettings ShippingRateSettings}. */
    "freeShippingThreshold"?: SchemaValue<DeliveryChargeSpecification | MonetaryAmount | IdReference, "freeShippingThreshold">;
    /** This can be marked 'true' to indicate that some published {@link https://schema.org/DeliveryTimeSettings DeliveryTimeSettings} or {@link https://schema.org/ShippingRateSettings ShippingRateSettings} are intended to apply to all {@link https://schema.org/OfferShippingDetails OfferShippingDetails} published by the same merchant, when referenced by a {@link https://schema.org/shippingSettingsLink shippingSettingsLink} in those settings. It is not meaningful to use a 'true' value for this property alongside a transitTimeLabel (for {@link https://schema.org/DeliveryTimeSettings DeliveryTimeSettings}) or shippingLabel (for {@link https://schema.org/ShippingRateSettings ShippingRateSettings}), since this property is for use with unlabelled settings. */
    "isUnlabelledFallback"?: SchemaValue<Boolean, "isUnlabelledFallback">;
    /** indicates (possibly multiple) shipping destinations. These can be defined in several ways, e.g. postalCode ranges. */
    "shippingDestination"?: SchemaValue<DefinedRegion | IdReference, "shippingDestination">;
    /** Label to match an {@link https://schema.org/OfferShippingDetails OfferShippingDetails} with a {@link https://schema.org/ShippingRateSettings ShippingRateSettings} (within the context of a {@link https://schema.org/shippingSettingsLink shippingSettingsLink} cross-reference). */
    "shippingLabel"?: SchemaValue<Text, "shippingLabel">;
    /** The shipping rate is the cost of shipping to the specified destination. Typically, the maxValue and currency values (of the {@link https://schema.org/MonetaryAmount MonetaryAmount}) are most appropriate. */
    "shippingRate"?: SchemaValue<MonetaryAmount | IdReference, "shippingRate">;
}
interface ShippingRateSettingsLeaf extends ShippingRateSettingsBase {
    "@type": "ShippingRateSettings";
}
/** A ShippingRateSettings represents re-usable pieces of shipping information. It is designed for publication on an URL that may be referenced via the {@link https://schema.org/shippingSettingsLink shippingSettingsLink} property of an {@link https://schema.org/OfferShippingDetails OfferShippingDetails}. Several occurrences can be published, distinguished and matched (i.e. identified/referenced) by their different values for {@link https://schema.org/shippingLabel shippingLabel}. */
export type ShippingRateSettings = ShippingRateSettingsLeaf;
interface ShoeStoreLeaf extends LocalBusinessBase {
    "@type": "ShoeStore";
}
/** A shoe store. */
export type ShoeStore = ShoeStoreLeaf | string;
interface ShoppingCenterLeaf extends LocalBusinessBase {
    "@type": "ShoppingCenter";
}
/** A shopping center or mall. */
export type ShoppingCenter = ShoppingCenterLeaf | string;
interface ShortStoryLeaf extends CreativeWorkBase {
    "@type": "ShortStory";
}
/** Short story or tale. A brief work of literature, usually written in narrative prose. */
export type ShortStory = ShortStoryLeaf;
interface SingleFamilyResidenceBase extends HouseBase {
    /** The number of rooms (excluding bathrooms and closets) of the accommodation or lodging business. Typical unit code(s): ROM for room or C62 for no unit. The type of room can be put in the unitText property of the QuantitativeValue. */
    "numberOfRooms"?: SchemaValue<Number | QuantitativeValue | IdReference, "numberOfRooms">;
    /** The allowed total occupancy for the accommodation in persons (including infants etc). For individual accommodations, this is not necessarily the legal maximum but defines the permitted usage as per the contractual agreement (e.g. a double room used by a single person). Typical unit code(s): C62 for person. */
    "occupancy"?: SchemaValue<QuantitativeValue | IdReference, "occupancy">;
}
interface SingleFamilyResidenceLeaf extends SingleFamilyResidenceBase {
    "@type": "SingleFamilyResidence";
}
/** Residence type: Single-family home. */
export type SingleFamilyResidence = SingleFamilyResidenceLeaf | string;
interface SiteNavigationElementLeaf extends WebPageElementBase {
    "@type": "SiteNavigationElement";
}
/** A navigation element of the page. */
export type SiteNavigationElement = SiteNavigationElementLeaf;
interface SizeGroupEnumerationLeaf extends EnumerationBase {
    "@type": "SizeGroupEnumeration";
}
/** Enumerates common size groups for various product categories. */
export type SizeGroupEnumeration = SizeGroupEnumerationLeaf | WearableSizeGroupEnumeration;
interface SizeSpecificationBase extends QualitativeValueBase {
    /** A measurement of an item, For example, the inseam of pants, the wheel size of a bicycle, the gauge of a screw, or the carbon footprint measured for certification by an authority. Usually an exact measurement, but can also be a range of measurements for adjustable products, for example belts and ski bindings. */
    "hasMeasurement"?: SchemaValue<QuantitativeValue | IdReference, "hasMeasurement">;
    /** The size group (also known as "size type") for a product's size. Size groups are common in the fashion industry to define size segments and suggested audiences for wearable products. Multiple values can be combined, for example "men's big and tall", "petite maternity" or "regular". */
    "sizeGroup"?: SchemaValue<SizeGroupEnumeration | Text | IdReference, "sizeGroup">;
    /** The size system used to identify a product's size. Typically either a standard (for example, "GS1" or "ISO-EN13402"), country code (for example "US" or "JP"), or a measuring system (for example "Metric" or "Imperial"). */
    "sizeSystem"?: SchemaValue<SizeSystemEnumeration | Text | IdReference, "sizeSystem">;
    /** The age or age range for the intended audience or person, for example 3-12 months for infants, 1-5 years for toddlers. */
    "suggestedAge"?: SchemaValue<QuantitativeValue | IdReference, "suggestedAge">;
    /** The suggested gender of the intended person or audience, for example "male", "female", or "unisex". */
    "suggestedGender"?: SchemaValue<GenderType | Text | IdReference, "suggestedGender">;
    /** A suggested range of body measurements for the intended audience or person, for example inseam between 32 and 34 inches or height between 170 and 190 cm. Typically found on a size chart for wearable products. */
    "suggestedMeasurement"?: SchemaValue<QuantitativeValue | IdReference, "suggestedMeasurement">;
}
interface SizeSpecificationLeaf extends SizeSpecificationBase {
    "@type": "SizeSpecification";
}
/** Size related properties of a product, typically a size code ({@link https://schema.org/name name}) and optionally a {@link https://schema.org/sizeSystem sizeSystem}, {@link https://schema.org/sizeGroup sizeGroup}, and product measurements ({@link https://schema.org/hasMeasurement hasMeasurement}). In addition, the intended audience can be defined through {@link https://schema.org/suggestedAge suggestedAge}, {@link https://schema.org/suggestedGender suggestedGender}, and suggested body measurements ({@link https://schema.org/suggestedMeasurement suggestedMeasurement}). */
export type SizeSpecification = SizeSpecificationLeaf;
interface SizeSystemEnumerationLeaf extends EnumerationBase {
    "@type": "SizeSystemEnumeration";
}
/** Enumerates common size systems for different categories of products, for example "EN-13402" or "UK" for wearables or "Imperial" for screws. */
export type SizeSystemEnumeration = "https://schema.org/SizeSystemImperial" | "SizeSystemImperial" | "https://schema.org/SizeSystemMetric" | "SizeSystemMetric" | SizeSystemEnumerationLeaf | WearableSizeSystemEnumeration;
interface SkiResortBase extends LocalBusinessBase, LodgingBusinessBase {
}
interface SkiResortLeaf extends SkiResortBase {
    "@type": "SkiResort";
}
/** A ski resort. */
export type SkiResort = SkiResortLeaf | string;
interface SocialEventLeaf extends EventBase {
    "@type": "SocialEvent";
}
/** Event type: Social event. */
export type SocialEvent = SocialEventLeaf;
interface SocialMediaPostingBase extends ArticleBase {
    /** A CreativeWork such as an image, video, or audio clip shared as part of this posting. */
    "sharedContent"?: SchemaValue<CreativeWork | IdReference, "sharedContent">;
}
interface SocialMediaPostingLeaf extends SocialMediaPostingBase {
    "@type": "SocialMediaPosting";
}
/** A post to a social media platform, including blog posts, tweets, Facebook posts, etc. */
export type SocialMediaPosting = SocialMediaPostingLeaf | BlogPosting | DiscussionForumPosting;
interface SoftwareApplicationBase extends CreativeWorkBase {
    /** Type of software application, e.g. 'Game, Multimedia'. */
    "applicationCategory"?: SchemaValue<Text | URL, "applicationCategory">;
    /** Subcategory of the application, e.g. 'Arcade Game'. */
    "applicationSubCategory"?: SchemaValue<Text | URL, "applicationSubCategory">;
    /** The name of the application suite to which the application belongs (e.g. Excel belongs to Office). */
    "applicationSuite"?: SchemaValue<Text, "applicationSuite">;
    /** Device required to run the application. Used in cases where a specific make/model is required to run the application. */
    "availableOnDevice"?: SchemaValue<Text, "availableOnDevice">;
    /** Countries for which the application is not supported. You can also provide the two-letter ISO 3166-1 alpha-2 country code. */
    "countriesNotSupported"?: SchemaValue<Text, "countriesNotSupported">;
    /** Countries for which the application is supported. You can also provide the two-letter ISO 3166-1 alpha-2 country code. */
    "countriesSupported"?: SchemaValue<Text, "countriesSupported">;
    /**
     * Device required to run the application. Used in cases where a specific make/model is required to run the application.
     *
     * @deprecated Consider using https://schema.org/availableOnDevice instead.
     */
    "device"?: SchemaValue<Text, "device">;
    /** If the file can be downloaded, URL to download the binary. */
    "downloadUrl"?: SchemaValue<URL, "downloadUrl">;
    /** Features or modules provided by this application (and possibly required by other applications). */
    "featureList"?: SchemaValue<Text | URL, "featureList">;
    /** Size of the application / package (e.g. 18MB). In the absence of a unit (MB, KB etc.), KB will be assumed. */
    "fileSize"?: SchemaValue<Text, "fileSize">;
    /** URL at which the app may be installed, if different from the URL of the item. */
    "installUrl"?: SchemaValue<URL, "installUrl">;
    /** Minimum memory requirements. */
    "memoryRequirements"?: SchemaValue<Text | URL, "memoryRequirements">;
    /** Operating systems supported (Windows 7, OS X 10.6, Android 1.6). */
    "operatingSystem"?: SchemaValue<Text, "operatingSystem">;
    /** Permission(s) required to run the app (for example, a mobile app may require full internet access or may run only on wifi). */
    "permissions"?: SchemaValue<Text, "permissions">;
    /** Processor architecture required to run the application (e.g. IA64). */
    "processorRequirements"?: SchemaValue<Text, "processorRequirements">;
    /** Description of what changed in this version. */
    "releaseNotes"?: SchemaValue<Text | URL, "releaseNotes">;
    /**
     * Component dependency requirements for application. This includes runtime environments and shared libraries that are not included in the application distribution package, but required to run the application (examples: DirectX, Java or .NET runtime).
     *
     * @deprecated Consider using https://schema.org/softwareRequirements instead.
     */
    "requirements"?: SchemaValue<Text | URL, "requirements">;
    /** A link to a screenshot image of the app. */
    "screenshot"?: SchemaValue<ImageObject | URL | IdReference, "screenshot">;
    /** Additional content for a software application. */
    "softwareAddOn"?: SchemaValue<SoftwareApplication | IdReference, "softwareAddOn">;
    /** Software application help. */
    "softwareHelp"?: SchemaValue<CreativeWork | IdReference, "softwareHelp">;
    /** Component dependency requirements for application. This includes runtime environments and shared libraries that are not included in the application distribution package, but required to run the application (examples: DirectX, Java or .NET runtime). */
    "softwareRequirements"?: SchemaValue<Text | URL, "softwareRequirements">;
    /** Version of the software instance. */
    "softwareVersion"?: SchemaValue<Text, "softwareVersion">;
    /** Storage requirements (free space required). */
    "storageRequirements"?: SchemaValue<Text | URL, "storageRequirements">;
    /** Supporting data for a SoftwareApplication. */
    "supportingData"?: SchemaValue<DataFeed | IdReference, "supportingData">;
}
interface SoftwareApplicationLeaf extends SoftwareApplicationBase {
    "@type": "SoftwareApplication";
}
/** A software application. */
export type SoftwareApplication = SoftwareApplicationLeaf | MobileApplication | VideoGame | WebApplication;
interface SoftwareSourceCodeBase extends CreativeWorkBase {
    /** Link to the repository where the un-compiled, human readable code and related code is located (SVN, GitHub, CodePlex). */
    "codeRepository"?: SchemaValue<URL, "codeRepository">;
    /** What type of code sample: full (compile ready) solution, code snippet, inline code, scripts, template. */
    "codeSampleType"?: SchemaValue<Text, "codeSampleType">;
    /** The computer programming language. */
    "programmingLanguage"?: SchemaValue<ComputerLanguage | Text | IdReference, "programmingLanguage">;
    /**
     * Runtime platform or script interpreter dependencies (example: Java v1, Python 2.3, .NET Framework 3.0).
     *
     * @deprecated Consider using https://schema.org/runtimePlatform instead.
     */
    "runtime"?: SchemaValue<Text, "runtime">;
    /** Runtime platform or script interpreter dependencies (example: Java v1, Python 2.3, .NET Framework 3.0). */
    "runtimePlatform"?: SchemaValue<Text, "runtimePlatform">;
    /**
     * What type of code sample: full (compile ready) solution, code snippet, inline code, scripts, template.
     *
     * @deprecated Consider using https://schema.org/codeSampleType instead.
     */
    "sampleType"?: SchemaValue<Text, "sampleType">;
    /** Target Operating System / Product to which the code applies. If applies to several versions, just the product name can be used. */
    "targetProduct"?: SchemaValue<SoftwareApplication | IdReference, "targetProduct">;
}
interface SoftwareSourceCodeLeaf extends SoftwareSourceCodeBase {
    "@type": "SoftwareSourceCode";
}
/** Computer programming source code. Example: Full (compile ready) solutions, code snippet samples, scripts, templates. */
export type SoftwareSourceCode = SoftwareSourceCodeLeaf;
interface SolveMathActionBase extends ActionBase {
    /** For questions that are part of learning resources (e.g. Quiz), eduQuestionType indicates the format of question being given. Example: "Multiple choice", "Open ended", "Flashcard". */
    "eduQuestionType"?: SchemaValue<Text, "eduQuestionType">;
}
interface SolveMathActionLeaf extends SolveMathActionBase {
    "@type": "SolveMathAction";
}
/** The action that takes in a math expression and directs users to a page potentially capable of solving/simplifying that expression. */
export type SolveMathAction = SolveMathActionLeaf;
interface SomeProductsBase extends ProductBase {
    /** The current approximate inventory level for the item or items. */
    "inventoryLevel"?: SchemaValue<QuantitativeValue | IdReference, "inventoryLevel">;
}
interface SomeProductsLeaf extends SomeProductsBase {
    "@type": "SomeProducts";
}
/** A placeholder for multiple similar products of the same kind. */
export type SomeProducts = SomeProductsLeaf;
interface SpeakableSpecificationBase extends ThingBase {
    /** A CSS selector, e.g. of a {@link https://schema.org/SpeakableSpecification SpeakableSpecification} or {@link https://schema.org/WebPageElement WebPageElement}. In the latter case, multiple matches within a page can constitute a single conceptual "Web page element". */
    "cssSelector"?: SchemaValue<CssSelectorType, "cssSelector">;
    /** An XPath, e.g. of a {@link https://schema.org/SpeakableSpecification SpeakableSpecification} or {@link https://schema.org/WebPageElement WebPageElement}. In the latter case, multiple matches within a page can constitute a single conceptual "Web page element". */
    "xpath"?: SchemaValue<XPathType, "xpath">;
}
interface SpeakableSpecificationLeaf extends SpeakableSpecificationBase {
    "@type": "SpeakableSpecification";
}
/** A SpeakableSpecification indicates (typically via {@link https://schema.org/xpath xpath} or {@link https://schema.org/cssSelector cssSelector}) sections of a document that are highlighted as particularly {@link https://schema.org/speakable speakable}. Instances of this type are expected to be used primarily as values of the {@link https://schema.org/speakable speakable} property. */
export type SpeakableSpecification = SpeakableSpecificationLeaf;
interface SpecialAnnouncementBase extends CreativeWorkBase {
    /** Indicates a specific {@link https://schema.org/CivicStructure CivicStructure} or {@link https://schema.org/LocalBusiness LocalBusiness} associated with the SpecialAnnouncement. For example, a specific testing facility or business with special opening hours. For a larger geographic region like a quarantine of an entire region, use {@link https://schema.org/spatialCoverage spatialCoverage}. */
    "announcementLocation"?: SchemaValue<CivicStructure | LocalBusiness | IdReference, "announcementLocation">;
    /** A category for the item. Greater signs or slashes can be used to informally indicate a category hierarchy. */
    "category"?: SchemaValue<CategoryCode | PhysicalActivityCategory | Text | Thing | URL | IdReference, "category">;
    /** Publication date of an online listing. */
    "datePosted"?: SchemaValue<Date | DateTime, "datePosted">;
    /** Information about disease prevention. */
    "diseasePreventionInfo"?: SchemaValue<URL | WebContent | IdReference, "diseasePreventionInfo">;
    /** Statistical information about the spread of a disease, either as {@link https://schema.org/WebContent WebContent}, or described directly as a {@link https://schema.org/Dataset Dataset}, or the specific {@link https://schema.org/Observation Observation}s in the dataset. When a {@link https://schema.org/WebContent WebContent} URL is provided, the page indicated might also contain more such markup. */
    "diseaseSpreadStatistics"?: SchemaValue<Dataset | Observation | URL | WebContent | IdReference, "diseaseSpreadStatistics">;
    /** Information about getting tested (for a {@link https://schema.org/MedicalCondition MedicalCondition}), e.g. in the context of a pandemic. */
    "gettingTestedInfo"?: SchemaValue<URL | WebContent | IdReference, "gettingTestedInfo">;
    /** governmentBenefitsInfo provides information about government benefits associated with a SpecialAnnouncement. */
    "governmentBenefitsInfo"?: SchemaValue<GovernmentService | IdReference, "governmentBenefitsInfo">;
    /** Indicates a page with news updates and guidelines. This could often be (but is not required to be) the main page containing {@link https://schema.org/SpecialAnnouncement SpecialAnnouncement} markup on a site. */
    "newsUpdatesAndGuidelines"?: SchemaValue<URL | WebContent | IdReference, "newsUpdatesAndGuidelines">;
    /** Information about public transport closures. */
    "publicTransportClosuresInfo"?: SchemaValue<URL | WebContent | IdReference, "publicTransportClosuresInfo">;
    /** Guidelines about quarantine rules, e.g. in the context of a pandemic. */
    "quarantineGuidelines"?: SchemaValue<URL | WebContent | IdReference, "quarantineGuidelines">;
    /** Information about school closures. */
    "schoolClosuresInfo"?: SchemaValue<URL | WebContent | IdReference, "schoolClosuresInfo">;
    /** Information about travel bans, e.g. in the context of a pandemic. */
    "travelBans"?: SchemaValue<URL | WebContent | IdReference, "travelBans">;
    /** The URL for a feed, e.g. associated with a podcast series, blog, or series of date-stamped updates. This is usually RSS or Atom. */
    "webFeed"?: SchemaValue<DataFeed | URL | IdReference, "webFeed">;
}
interface SpecialAnnouncementLeaf extends SpecialAnnouncementBase {
    "@type": "SpecialAnnouncement";
}
/**
 * A SpecialAnnouncement combines a simple date-stamped textual information update with contextualized Web links and other structured data. It represents an information update made by a locally-oriented organization, for example schools, pharmacies, healthcare providers, community groups, police, local government.
 *
 * For work in progress guidelines on Coronavirus-related markup see {@link https://docs.google.com/document/d/14ikaGCKxo50rRM7nvKSlbUpjyIk2WMQd3IkB1lItlrM/edit# this doc}.
 *
 * The motivating scenario for SpecialAnnouncement is the {@link https://en.wikipedia.org/wiki/2019%E2%80%9320_coronavirus_pandemic Coronavirus pandemic}, and the initial vocabulary is oriented to this urgent situation. Schema.org expect to improve the markup iteratively as it is deployed and as feedback emerges from use. In addition to our usual {@link https://github.com/schemaorg/schemaorg/issues/2490 Github entry}, feedback comments can also be provided in {@link https://docs.google.com/document/d/1fpdFFxk8s87CWwACs53SGkYv3aafSxz_DTtOQxMrBJQ/edit# this document}.
 *
 * While this schema is designed to communicate urgent crisis-related information, it is not the same as an emergency warning technology like {@link https://en.wikipedia.org/wiki/Common_Alerting_Protocol CAP}, although there may be overlaps. The intent is to cover the kinds of everyday practical information being posted to existing websites during an emergency situation.
 *
 * Several kinds of information can be provided:
 *
 * We encourage the provision of "name", "text", "datePosted", "expires" (if appropriate), "category" and "url" as a simple baseline. It is important to provide a value for "category" where possible, most ideally as a well known URL from Wikipedia or Wikidata. In the case of the 2019-2020 Coronavirus pandemic, this should be "https://en.wikipedia.org/w/index.php?title=2019-20_coronavirus_pandemic" or "https://www.wikidata.org/wiki/Q81068910".
 *
 * For many of the possible properties, values can either be simple links or an inline description, depending on whether a summary is available. For a link, provide just the URL of the appropriate page as the property's value. For an inline description, use a {@link https://schema.org/WebContent WebContent} type, and provide the url as a property of that, alongside at least a simple "{@link https://schema.org/text text}" summary of the page. It is unlikely that a single SpecialAnnouncement will need all of the possible properties simultaneously.
 *
 * We expect that in many cases the page referenced might contain more specialized structured data, e.g. contact info, {@link https://schema.org/openingHours openingHours}, {@link https://schema.org/Event Event}, {@link https://schema.org/FAQPage FAQPage} etc. By linking to those pages from a {@link https://schema.org/SpecialAnnouncement SpecialAnnouncement} you can help make it clearer that the events are related to the situation (e.g. Coronavirus) indicated by the {@link https://schema.org/category category} property of the {@link https://schema.org/SpecialAnnouncement SpecialAnnouncement}.
 *
 * Many {@link https://schema.org/SpecialAnnouncement SpecialAnnouncement}s will relate to particular regions and to identifiable local organizations. Use {@link https://schema.org/spatialCoverage spatialCoverage} for the region, and {@link https://schema.org/announcementLocation announcementLocation} to indicate specific {@link https://schema.org/LocalBusiness LocalBusiness}es and {@link https://schema.org/CivicStructure CivicStructure}s. If the announcement affects both a particular region and a specific location (for example, a library closure that serves an entire region), use both {@link https://schema.org/spatialCoverage spatialCoverage} and {@link https://schema.org/announcementLocation announcementLocation}.
 *
 * The {@link https://schema.org/about about} property can be used to indicate entities that are the focus of the announcement. We now recommend using {@link https://schema.org/about about} only for representing non-location entities (e.g. a {@link https://schema.org/Course Course} or a {@link https://schema.org/RadioStation RadioStation}). For places, use {@link https://schema.org/announcementLocation announcementLocation} and {@link https://schema.org/spatialCoverage spatialCoverage}. Consumers of this markup should be aware that the initial design encouraged the use of {@link https://schema.org/about about} for locations too.
 *
 * The basic content of {@link https://schema.org/SpecialAnnouncement SpecialAnnouncement} is similar to that of an {@link https://en.wikipedia.org/wiki/RSS RSS} or {@link https://en.wikipedia.org/wiki/Atom_(Web_standard) Atom} feed. For publishers without such feeds, basic feed-like information can be shared by posting {@link https://schema.org/SpecialAnnouncement SpecialAnnouncement} updates in a page, e.g. using JSON-LD. For sites with Atom/RSS functionality, you can point to a feed with the {@link https://schema.org/webFeed webFeed} property. This can be a simple URL, or an inline {@link https://schema.org/DataFeed DataFeed} object, with {@link https://schema.org/encodingFormat encodingFormat} providing media type information, e.g. "application/rss+xml" or "application/atom+xml".
 */
export type SpecialAnnouncement = SpecialAnnouncementLeaf;
interface SpecialtyLeaf extends EnumerationBase {
    "@type": "Specialty";
}
/** Any branch of a field in which people typically develop specific expertise, usually after significant study, time, and effort. */
export type Specialty = SpecialtyLeaf | MedicalSpecialty;
interface SportingGoodsStoreLeaf extends LocalBusinessBase {
    "@type": "SportingGoodsStore";
}
/** A sporting goods store. */
export type SportingGoodsStore = SportingGoodsStoreLeaf | string;
interface SportsActivityLocationLeaf extends LocalBusinessBase {
    "@type": "SportsActivityLocation";
}
/** A sports location, such as a playing field. */
export type SportsActivityLocation = SportsActivityLocationLeaf | BowlingAlley | ExerciseGym | GolfCourse | HealthClub | PublicSwimmingPool | SkiResort | SportsClub | StadiumOrArena | TennisComplex | string;
interface SportsClubLeaf extends LocalBusinessBase {
    "@type": "SportsClub";
}
/** A sports club. */
export type SportsClub = SportsClubLeaf | string;
interface SportsEventBase extends EventBase {
    /** The away team in a sports event. */
    "awayTeam"?: SchemaValue<Person | SportsTeam | IdReference, "awayTeam">;
    /** A competitor in a sports event. */
    "competitor"?: SchemaValue<Person | SportsTeam | IdReference, "competitor">;
    /** The home team in a sports event. */
    "homeTeam"?: SchemaValue<Person | SportsTeam | IdReference, "homeTeam">;
    /** A type of sport (e.g. Baseball). */
    "sport"?: SchemaValue<Text | URL, "sport">;
}
interface SportsEventLeaf extends SportsEventBase {
    "@type": "SportsEvent";
}
/** Event type: Sports event. */
export type SportsEvent = SportsEventLeaf;
interface SportsOrganizationBase extends OrganizationBase {
    /** A type of sport (e.g. Baseball). */
    "sport"?: SchemaValue<Text | URL, "sport">;
}
interface SportsOrganizationLeaf extends SportsOrganizationBase {
    "@type": "SportsOrganization";
}
/** Represents the collection of all sports organizations, including sports teams, governing bodies, and sports associations. */
export type SportsOrganization = SportsOrganizationLeaf | SportsTeam | string;
interface SportsTeamBase extends SportsOrganizationBase {
    /** A person that acts as performing member of a sports team; a player as opposed to a coach. */
    "athlete"?: SchemaValue<Person | IdReference, "athlete">;
    /** A person that acts in a coaching role for a sports team. */
    "coach"?: SchemaValue<Person | IdReference, "coach">;
    /** Gender of something, typically a {@link https://schema.org/Person Person}, but possibly also fictional characters, animals, etc. While https://schema.org/Male and https://schema.org/Female may be used, text strings are also acceptable for people who do not identify as a binary gender. The {@link https://schema.org/gender gender} property can also be used in an extended sense to cover e.g. the gender of sports teams. As with the gender of individuals, we do not try to enumerate all possibilities. A mixed-gender {@link https://schema.org/SportsTeam SportsTeam} can be indicated with a text value of "Mixed". */
    "gender"?: SchemaValue<GenderType | Text | IdReference, "gender">;
}
interface SportsTeamLeaf extends SportsTeamBase {
    "@type": "SportsTeam";
}
/** Organization: Sports team. */
export type SportsTeam = SportsTeamLeaf | string;
interface SpreadsheetDigitalDocumentLeaf extends DigitalDocumentBase {
    "@type": "SpreadsheetDigitalDocument";
}
/** A spreadsheet file. */
export type SpreadsheetDigitalDocument = SpreadsheetDigitalDocumentLeaf;
interface StadiumOrArenaBase extends LocalBusinessBase, CivicStructureBase {
}
interface StadiumOrArenaLeaf extends StadiumOrArenaBase {
    "@type": "StadiumOrArena";
}
/** A stadium. */
export type StadiumOrArena = StadiumOrArenaLeaf | string;
interface StateLeaf extends PlaceBase {
    "@type": "State";
}
/** A state or province of a country. */
export type State = StateLeaf | string;
interface StatementLeaf extends CreativeWorkBase {
    "@type": "Statement";
}
/** A statement about something, for example a fun or interesting fact. If known, the main entity this statement is about can be indicated using mainEntity. For more formal claims (e.g. in Fact Checking), consider using {@link https://schema.org/Claim Claim} instead. Use the {@link https://schema.org/text text} property to capture the text of the statement. */
export type Statement = StatementLeaf;
interface StatisticalPopulationBase extends ThingBase {
    /** Indicates the populationType common to all members of a {@link https://schema.org/StatisticalPopulation StatisticalPopulation} or all cases within the scope of a {@link https://schema.org/StatisticalVariable StatisticalVariable}. */
    "populationType"?: SchemaValue<Class | IdReference, "populationType">;
}
interface StatisticalPopulationLeaf extends StatisticalPopulationBase {
    "@type": "StatisticalPopulation";
}
/** A StatisticalPopulation is a set of instances of a certain given type that satisfy some set of constraints. The property {@link https://schema.org/populationType populationType} is used to specify the type. Any property that can be used on instances of that type can appear on the statistical population. For example, a {@link https://schema.org/StatisticalPopulation StatisticalPopulation} representing all {@link https://schema.org/Person Person}s with a {@link https://schema.org/homeLocation homeLocation} of East Podunk California would be described by applying the appropriate {@link https://schema.org/homeLocation homeLocation} and {@link https://schema.org/populationType populationType} properties to a {@link https://schema.org/StatisticalPopulation StatisticalPopulation} item that stands for that set of people. The properties {@link https://schema.org/numConstraints numConstraints} and {@link https://schema.org/constraintProperty constraintProperty} are used to specify which of the populations properties are used to specify the population. Note that the sense of "population" used here is the general sense of a statistical population, and does not imply that the population consists of people. For example, a {@link https://schema.org/populationType populationType} of {@link https://schema.org/Event Event} or {@link https://schema.org/NewsArticle NewsArticle} could be used. See also {@link https://schema.org/Observation Observation}, where a {@link https://schema.org/populationType populationType} such as {@link https://schema.org/Person Person} or {@link https://schema.org/Event Event} can be indicated directly. In most cases it may be better to use {@link https://schema.org/StatisticalVariable StatisticalVariable} instead of {@link https://schema.org/StatisticalPopulation StatisticalPopulation}. */
export type StatisticalPopulation = StatisticalPopulationLeaf;
interface StatisticalVariableBase extends ConstraintNodeBase {
    /** The measuredProperty of an {@link https://schema.org/Observation Observation}, typically via its {@link https://schema.org/StatisticalVariable StatisticalVariable}. There are various kinds of applicable {@link https://schema.org/Property Property}: a schema.org property, a property from other RDF-compatible systems, e.g. W3C RDF Data Cube, Data Commons, Wikidata, or schema.org extensions such as {@link https://www.gs1.org/voc/?show=properties GS1's}. */
    "measuredProperty"?: SchemaValue<Property | IdReference, "measuredProperty">;
    /** Identifies the denominator variable when an observation represents a ratio or percentage. */
    "measurementDenominator"?: SchemaValue<StatisticalVariable | IdReference, "measurementDenominator">;
    /** A subproperty of {@link https://schema.org/measurementTechnique measurementTechnique} that can be used for specifying specific methods, in particular via {@link https://schema.org/MeasurementMethodEnum MeasurementMethodEnum}. */
    "measurementMethod"?: SchemaValue<DefinedTerm | MeasurementMethodEnum | Text | URL | IdReference, "measurementMethod">;
    /** Provides additional qualification to an observation. For example, a GDP observation measures the Nominal value. */
    "measurementQualifier"?: SchemaValue<Enumeration | IdReference, "measurementQualifier">;
    /**
     * A technique, method or technology used in an {@link https://schema.org/Observation Observation}, {@link https://schema.org/StatisticalVariable StatisticalVariable} or {@link https://schema.org/Dataset Dataset} (or {@link https://schema.org/DataDownload DataDownload}, {@link https://schema.org/DataCatalog DataCatalog}), corresponding to the method used for measuring the corresponding variable(s) (for datasets, described using {@link https://schema.org/variableMeasured variableMeasured}; for {@link https://schema.org/Observation Observation}, a {@link https://schema.org/StatisticalVariable StatisticalVariable}). Often but not necessarily each {@link https://schema.org/variableMeasured variableMeasured} will have an explicit representation as (or mapping to) an property such as those defined in Schema.org, or other RDF vocabularies and "knowledge graphs". In that case the subproperty of {@link https://schema.org/variableMeasured variableMeasured} called {@link https://schema.org/measuredProperty measuredProperty} is applicable.
     *
     * The {@link https://schema.org/measurementTechnique measurementTechnique} property helps when extra clarification is needed about how a {@link https://schema.org/measuredProperty measuredProperty} was measured. This is oriented towards scientific and scholarly dataset publication but may have broader applicability; it is not intended as a full representation of measurement, but can often serve as a high level summary for dataset discovery.
     *
     * For example, if {@link https://schema.org/variableMeasured variableMeasured} is: molecule concentration, {@link https://schema.org/measurementTechnique measurementTechnique} could be: "mass spectrometry" or "nmr spectroscopy" or "colorimetry" or "immunofluorescence". If the {@link https://schema.org/variableMeasured variableMeasured} is "depression rating", the {@link https://schema.org/measurementTechnique measurementTechnique} could be "Zung Scale" or "HAM-D" or "Beck Depression Inventory".
     *
     * If there are several {@link https://schema.org/variableMeasured variableMeasured} properties recorded for some given data object, use a {@link https://schema.org/PropertyValue PropertyValue} for each {@link https://schema.org/variableMeasured variableMeasured} and attach the corresponding {@link https://schema.org/measurementTechnique measurementTechnique}. The value can also be from an enumeration, organized as a {@link https://schema.org/MeasurementMetholdEnumeration MeasurementMetholdEnumeration}.
     */
    "measurementTechnique"?: SchemaValue<DefinedTerm | MeasurementMethodEnum | Text | URL | IdReference, "measurementTechnique">;
    /** Indicates the populationType common to all members of a {@link https://schema.org/StatisticalPopulation StatisticalPopulation} or all cases within the scope of a {@link https://schema.org/StatisticalVariable StatisticalVariable}. */
    "populationType"?: SchemaValue<Class | IdReference, "populationType">;
    /** Indicates the kind of statistic represented by a {@link https://schema.org/StatisticalVariable StatisticalVariable}, e.g. mean, count etc. The value of statType is a property, either from within Schema.org (e.g. {@link https://schema.org/median median}, {@link https://schema.org/marginOfError marginOfError}, {@link https://schema.org/maxValue maxValue}, {@link https://schema.org/minValue minValue}) or from other compatible (e.g. RDF) systems such as DataCommons.org or Wikidata.org. */
    "statType"?: SchemaValue<Property | Text | URL | IdReference, "statType">;
}
interface StatisticalVariableLeaf extends StatisticalVariableBase {
    "@type": "StatisticalVariable";
}
/** {@link https://schema.org/StatisticalVariable StatisticalVariable} represents any type of statistical metric that can be measured at a place and time. The usage pattern for {@link https://schema.org/StatisticalVariable StatisticalVariable} is typically expressed using {@link https://schema.org/Observation Observation} with an explicit {@link https://schema.org/populationType populationType}, which is a type, typically drawn from Schema.org. Each {@link https://schema.org/StatisticalVariable StatisticalVariable} is marked as a {@link https://schema.org/ConstraintNode ConstraintNode}, meaning that some properties (those listed using {@link https://schema.org/constraintProperty constraintProperty}) serve in this setting solely to define the statistical variable rather than literally describe a specific person, place or thing. For example, a {@link https://schema.org/StatisticalVariable StatisticalVariable} Median_Height_Person_Female representing the median height of women, could be written as follows: the population type is {@link https://schema.org/Person Person}; the measuredProperty {@link https://schema.org/height height}; the {@link https://schema.org/statType statType} {@link https://schema.org/median median}; the {@link https://schema.org/gender gender} {@link https://schema.org/Female Female}. It is important to note that there are many kinds of scientific quantitative observation which are not fully, perfectly or unambiguously described following this pattern, or with solely Schema.org terminology. The approach taken here is designed to allow partial, incremental or minimal description of {@link https://schema.org/StatisticalVariable StatisticalVariable}s, and the use of detailed sets of entity and property IDs from external repositories. The {@link https://schema.org/measurementMethod measurementMethod}, {@link https://schema.org/unitCode unitCode} and {@link https://schema.org/unitText unitText} properties can also be used to clarify the specific nature and notation of an observed measurement. */
export type StatisticalVariable = StatisticalVariableLeaf;
interface StatusEnumerationLeaf extends EnumerationBase {
    "@type": "StatusEnumeration";
}
/** Lists or enumerations dealing with status types. */
export type StatusEnumeration = StatusEnumerationLeaf | ActionStatusType | EventStatusType | GameServerStatus | LegalForceStatus | OrderStatus | PaymentStatusType | ReservationStatusType;
interface SteeringPositionValueLeaf extends QualitativeValueBase {
    "@type": "SteeringPositionValue";
}
/** A value indicating a steering position. */
export type SteeringPositionValue = "https://schema.org/LeftHandDriving" | "LeftHandDriving" | "https://schema.org/RightHandDriving" | "RightHandDriving" | SteeringPositionValueLeaf;
interface StoreLeaf extends LocalBusinessBase {
    "@type": "Store";
}
/** A retail good store. */
export type Store = StoreLeaf | AutoPartsStore | BikeStore | BookStore | ClothingStore | ComputerStore | ConvenienceStore | DepartmentStore | ElectronicsStore | Florist | FurnitureStore | GardenStore | GroceryStore | HardwareStore | HobbyShop | HomeGoodsStore | JewelryStore | LiquorStore | MensClothingStore | MobilePhoneStore | MovieRentalStore | MusicStore | OfficeEquipmentStore | OutletStore | PawnShop | PetStore | ShoeStore | SportingGoodsStore | TireShop | ToyStore | WholesaleStore | string;
interface StructuredValueLeaf extends ThingBase {
    "@type": "StructuredValue";
}
/** Structured values are used when the value of a property has a more complex structure than simply being a textual value or a reference to another thing. */
export type StructuredValue = StructuredValueLeaf | CDCPMDRecord | ContactPoint | DatedMoneySpecification | DefinedRegion | DeliveryTimeSettings | EngineSpecification | ExchangeRateSpecification | GeoCoordinates | GeoShape | InteractionCounter | MonetaryAmount | NutritionInformation | OfferShippingDetails | OpeningHoursSpecification | OwnershipInfo | PostalCodeRangeSpecification | PriceSpecification | PropertyValue | QuantitativeValue | QuantitativeValueDistribution | RepaymentSpecification | ShippingDeliveryTime | ShippingRateSettings | TypeAndQuantityNode | WarrantyPromise;
interface StupidTypeBase extends ThingBase {
    /** This is a StupidProperty! - for testing only. */
    "stupidProperty"?: SchemaValue<QuantitativeValue | IdReference, "stupidProperty">;
}
interface StupidTypeLeaf extends StupidTypeBase {
    "@type": "StupidType";
}
/** A StupidType for testing. */
export type StupidType = StupidTypeLeaf;
interface SubscribeActionLeaf extends ActionBase {
    "@type": "SubscribeAction";
}
/**
 * The act of forming a personal connection with someone/something (object) unidirectionally/asymmetrically to get updates pushed to.
 *
 * Related actions:
 * - {@link https://schema.org/FollowAction FollowAction}: Unlike FollowAction, SubscribeAction implies that the subscriber acts as a passive agent being constantly/actively pushed for updates.
 * - {@link https://schema.org/RegisterAction RegisterAction}: Unlike RegisterAction, SubscribeAction implies that the agent is interested in continuing receiving updates from the object.
 * - {@link https://schema.org/JoinAction JoinAction}: Unlike JoinAction, SubscribeAction implies that the agent is interested in continuing receiving updates from the object.
 */
export type SubscribeAction = SubscribeActionLeaf;
interface SubstanceBase extends MedicalEntityBase {
    /** An active ingredient, typically chemical compounds and/or biologic substances. */
    "activeIngredient"?: SchemaValue<Text, "activeIngredient">;
    /** Recommended intake of this supplement for a given population as defined by a specific recommending authority. */
    "maximumIntake"?: SchemaValue<MaximumDoseSchedule | IdReference, "maximumIntake">;
}
interface SubstanceLeaf extends SubstanceBase {
    "@type": "Substance";
}
/** Any matter of defined composition that has discrete existence, whose origin may be biological, mineral or chemical. */
export type Substance = SubstanceLeaf | DietarySupplement | Drug;
interface SubwayStationLeaf extends CivicStructureBase {
    "@type": "SubwayStation";
}
/** A subway station. */
export type SubwayStation = SubwayStationLeaf | string;
interface SuiteBase extends AccommodationBase {
    /** The type of bed or beds included in the accommodation. For the single case of just one bed of a certain type, you use bed directly with a text. If you want to indicate the quantity of a certain kind of bed, use an instance of BedDetails. For more detailed information, use the amenityFeature property. */
    "bed"?: SchemaValue<BedDetails | BedType | Text | IdReference, "bed">;
    /** The number of rooms (excluding bathrooms and closets) of the accommodation or lodging business. Typical unit code(s): ROM for room or C62 for no unit. The type of room can be put in the unitText property of the QuantitativeValue. */
    "numberOfRooms"?: SchemaValue<Number | QuantitativeValue | IdReference, "numberOfRooms">;
    /** The allowed total occupancy for the accommodation in persons (including infants etc). For individual accommodations, this is not necessarily the legal maximum but defines the permitted usage as per the contractual agreement (e.g. a double room used by a single person). Typical unit code(s): C62 for person. */
    "occupancy"?: SchemaValue<QuantitativeValue | IdReference, "occupancy">;
}
interface SuiteLeaf extends SuiteBase {
    "@type": "Suite";
}
/**
 * A suite in a hotel or other public accommodation, denotes a class of luxury accommodations, the key feature of which is multiple rooms (source: Wikipedia, the free encyclopedia, see {@link http://en.wikipedia.org/wiki/Suite_(hotel) http://en.wikipedia.org/wiki/Suite_(hotel)}).
 *
 * See also the {@link /docs/hotels.html dedicated document on the use of schema.org for marking up hotels and other forms of accommodations}.
 */
export type Suite = SuiteLeaf | string;
interface SuperficialAnatomyBase extends MedicalEntityBase {
    /** If applicable, a description of the pathophysiology associated with the anatomical system, including potential abnormal changes in the mechanical, physical, and biochemical functions of the system. */
    "associatedPathophysiology"?: SchemaValue<Text, "associatedPathophysiology">;
    /** Anatomical systems or structures that relate to the superficial anatomy. */
    "relatedAnatomy"?: SchemaValue<AnatomicalStructure | AnatomicalSystem | IdReference, "relatedAnatomy">;
    /** A medical condition associated with this anatomy. */
    "relatedCondition"?: SchemaValue<MedicalCondition | IdReference, "relatedCondition">;
    /** A medical therapy related to this anatomy. */
    "relatedTherapy"?: SchemaValue<MedicalTherapy | IdReference, "relatedTherapy">;
    /** The significance associated with the superficial anatomy; as an example, how characteristics of the superficial anatomy can suggest underlying medical conditions or courses of treatment. */
    "significance"?: SchemaValue<Text, "significance">;
}
interface SuperficialAnatomyLeaf extends SuperficialAnatomyBase {
    "@type": "SuperficialAnatomy";
}
/** Anatomical features that can be observed by sight (without dissection), including the form and proportions of the human body as well as surface landmarks that correspond to deeper subcutaneous structures. Superficial anatomy plays an important role in sports medicine, phlebotomy, and other medical specialties as underlying anatomical structures can be identified through surface palpation. For example, during back surgery, superficial anatomy can be used to palpate and count vertebrae to find the site of incision. Or in phlebotomy, superficial anatomy can be used to locate an underlying vein; for example, the median cubital vein can be located by palpating the borders of the cubital fossa (such as the epicondyles of the humerus) and then looking for the superficial signs of the vein, such as size, prominence, ability to refill after depression, and feel of surrounding tissue support. As another example, in a subluxation (dislocation) of the glenohumeral joint, the bony structure becomes pronounced with the deltoid muscle failing to cover the glenohumeral joint allowing the edges of the scapula to be superficially visible. Here, the superficial anatomy is the visible edges of the scapula, implying the underlying dislocation of the joint (the related anatomical structure). */
export type SuperficialAnatomy = SuperficialAnatomyLeaf;
interface SurgicalProcedureLeaf extends MedicalProcedureBase {
    "@type": "SurgicalProcedure";
}
/** A medical procedure involving an incision with instruments; performed for diagnose, or therapeutic purposes. */
export type SurgicalProcedure = SurgicalProcedureLeaf;
interface SuspendActionLeaf extends ActionBase {
    "@type": "SuspendAction";
}
/** The act of momentarily pausing a device or application (e.g. pause music playback or pause a timer). */
export type SuspendAction = SuspendActionLeaf;
interface SyllabusLeaf extends LearningResourceBase {
    "@type": "Syllabus";
}
/** A syllabus that describes the material covered in a course, often with several such sections per {@link https://schema.org/Course Course} so that a distinct {@link https://schema.org/timeRequired timeRequired} can be provided for that section of the {@link https://schema.org/Course Course}. */
export type Syllabus = SyllabusLeaf;
interface SynagogueLeaf extends CivicStructureBase {
    "@type": "Synagogue";
}
/** A synagogue. */
export type Synagogue = SynagogueLeaf | string;
interface TableLeaf extends WebPageElementBase {
    "@type": "Table";
}
/** A table on a Web page. */
export type Table = TableLeaf;
interface TakeActionLeaf extends TransferActionBase {
    "@type": "TakeAction";
}
/**
 * The act of gaining ownership of an object from an origin. Reciprocal of GiveAction.
 *
 * Related actions:
 * - {@link https://schema.org/GiveAction GiveAction}: The reciprocal of TakeAction.
 * - {@link https://schema.org/ReceiveAction ReceiveAction}: Unlike ReceiveAction, TakeAction implies that ownership has been transferred.
 */
export type TakeAction = TakeActionLeaf;
interface TattooParlorLeaf extends LocalBusinessBase {
    "@type": "TattooParlor";
}
/** A tattoo parlor. */
export type TattooParlor = TattooParlorLeaf | string;
interface TaxiLeaf extends ServiceBase {
    "@type": "Taxi";
}
/**
 * A taxi.
 *
 * @deprecated Use TaxiService instead.
 */
export type Taxi = TaxiLeaf;
interface TaxiReservationBase extends ReservationBase {
    /** Number of people the reservation should accommodate. */
    "partySize"?: SchemaValue<Integer | QuantitativeValue | IdReference, "partySize">;
    /** Where a taxi will pick up a passenger or a rental car can be picked up. */
    "pickupLocation"?: SchemaValue<Place | IdReference, "pickupLocation">;
    /** When a taxi will pick up a passenger or a rental car can be picked up. */
    "pickupTime"?: SchemaValue<DateTime, "pickupTime">;
}
interface TaxiReservationLeaf extends TaxiReservationBase {
    "@type": "TaxiReservation";
}
/**
 * A reservation for a taxi.
 *
 * Note: This type is for information about actual reservations, e.g. in confirmation emails or HTML pages with individual confirmations of reservations. For offers of tickets, use {@link https://schema.org/Offer Offer}.
 */
export type TaxiReservation = TaxiReservationLeaf;
interface TaxiServiceLeaf extends ServiceBase {
    "@type": "TaxiService";
}
/** A service for a vehicle for hire with a driver for local travel. Fares are usually calculated based on distance traveled. */
export type TaxiService = TaxiServiceLeaf;
interface TaxiStandLeaf extends CivicStructureBase {
    "@type": "TaxiStand";
}
/** A taxi stand. */
export type TaxiStand = TaxiStandLeaf | string;
interface TaxonBase extends ThingBase {
    /** Closest child taxa of the taxon in question. */
    "childTaxon"?: SchemaValue<Taxon | Text | URL | IdReference, "childTaxon">;
    /** A Defined Term contained in this term set. */
    "hasDefinedTerm"?: SchemaValue<DefinedTerm | IdReference, "hasDefinedTerm">;
    /** Closest parent taxon of the taxon in question. */
    "parentTaxon"?: SchemaValue<Taxon | Text | URL | IdReference, "parentTaxon">;
    /** The taxonomic rank of this taxon given preferably as a URI from a controlled vocabulary – typically the ranks from TDWG TaxonRank ontology or equivalent Wikidata URIs. */
    "taxonRank"?: SchemaValue<PropertyValue | Text | URL | IdReference, "taxonRank">;
}
interface TaxonLeaf extends TaxonBase {
    "@type": "Taxon";
}
/** A set of organisms asserted to represent a natural cohesive biological unit. */
export type Taxon = TaxonLeaf;
interface TechArticleBase extends ArticleBase {
    /** Prerequisites needed to fulfill steps in article. */
    "dependencies"?: SchemaValue<Text, "dependencies">;
    /** Proficiency needed for this content; expected values: 'Beginner', 'Expert'. */
    "proficiencyLevel"?: SchemaValue<Text, "proficiencyLevel">;
}
interface TechArticleLeaf extends TechArticleBase {
    "@type": "TechArticle";
}
/** A technical article - Example: How-to (task) topics, step-by-step, procedural troubleshooting, specifications, etc. */
export type TechArticle = TechArticleLeaf | APIReference;
interface TelevisionChannelLeaf extends BroadcastChannelBase {
    "@type": "TelevisionChannel";
}
/** A unique instance of a television BroadcastService on a CableOrSatelliteService lineup. */
export type TelevisionChannel = TelevisionChannelLeaf;
interface TelevisionStationLeaf extends LocalBusinessBase {
    "@type": "TelevisionStation";
}
/** A television station. */
export type TelevisionStation = TelevisionStationLeaf | string;
interface TennisComplexLeaf extends LocalBusinessBase {
    "@type": "TennisComplex";
}
/** A tennis complex. */
export type TennisComplex = TennisComplexLeaf | string;
interface TextDigitalDocumentLeaf extends DigitalDocumentBase {
    "@type": "TextDigitalDocument";
}
/** A file composed primarily of text. */
export type TextDigitalDocument = TextDigitalDocumentLeaf;
interface TextObjectLeaf extends MediaObjectBase {
    "@type": "TextObject";
}
/** A text file. The text can be unformatted or contain markup, html, etc. */
export type TextObject = TextObjectLeaf;
interface TheaterEventLeaf extends EventBase {
    "@type": "TheaterEvent";
}
/** Event type: Theater performance. */
export type TheaterEvent = TheaterEventLeaf;
interface TheaterGroupLeaf extends OrganizationBase {
    "@type": "TheaterGroup";
}
/** A theater group or company, for example, the Royal Shakespeare Company or Druid Theatre. */
export type TheaterGroup = TheaterGroupLeaf | string;
interface TherapeuticProcedureBase extends MedicalProcedureBase {
    /** A possible complication and/or side effect of this therapy. If it is known that an adverse outcome is serious (resulting in death, disability, or permanent damage; requiring hospitalization; or otherwise life-threatening or requiring immediate medical attention), tag it as a seriousAdverseOutcome instead. */
    "adverseOutcome"?: SchemaValue<MedicalEntity | IdReference, "adverseOutcome">;
    /** A dosing schedule for the drug for a given population, either observed, recommended, or maximum dose based on the type used. */
    "doseSchedule"?: SchemaValue<DoseSchedule | IdReference, "doseSchedule">;
    /** Specifying a drug or medicine used in a medication procedure. */
    "drug"?: SchemaValue<Drug | IdReference, "drug">;
}
interface TherapeuticProcedureLeaf extends TherapeuticProcedureBase {
    "@type": "TherapeuticProcedure";
}
/** A medical procedure intended primarily for therapeutic purposes, aimed at improving a health condition. */
export type TherapeuticProcedure = TherapeuticProcedureLeaf | MedicalTherapy | PsychologicalTreatment;
interface ThesisBase extends CreativeWorkBase {
    /** Qualification, candidature, degree, application that Thesis supports. */
    "inSupportOf"?: SchemaValue<Text, "inSupportOf">;
}
interface ThesisLeaf extends ThesisBase {
    "@type": "Thesis";
}
/** A thesis or dissertation document submitted in support of candidature for an academic degree or professional qualification. */
export type Thesis = ThesisLeaf;
interface ThingBase extends Partial<IdReference> {
    /** An additional type for the item, typically used for adding more specific types from external vocabularies in microdata syntax. This is a relationship between something and a class that the thing is in. Typically the value is a URI-identified RDF class, and in this case corresponds to the use of rdf:type in RDF. Text values can be used sparingly, for cases where useful information can be added without their being an appropriate schema to reference. In the case of text values, the class label should follow the schema.org {@link https://schema.org/docs/styleguide.html style guide}. */
    "additionalType"?: SchemaValue<Text | URL, "additionalType">;
    /** An alias for the item. */
    "alternateName"?: SchemaValue<Text, "alternateName">;
    /** A description of the item. */
    "description"?: SchemaValue<Text | TextObject | IdReference, "description">;
    /** A sub property of description. A short description of the item used to disambiguate from other, similar items. Information from other properties (in particular, name) may be necessary for the description to be useful for disambiguation. */
    "disambiguatingDescription"?: SchemaValue<Text, "disambiguatingDescription">;
    /** The identifier property represents any kind of identifier for any kind of {@link https://schema.org/Thing Thing}, such as ISBNs, GTIN codes, UUIDs etc. Schema.org provides dedicated properties for representing many of these, either as textual strings or as URL (URI) links. See {@link /docs/datamodel.html#identifierBg background notes} for more details. */
    "identifier"?: SchemaValue<PropertyValue | Text | URL | IdReference, "identifier">;
    /** An image of the item. This can be a {@link https://schema.org/URL URL} or a fully described {@link https://schema.org/ImageObject ImageObject}. */
    "image"?: SchemaValue<ImageObject | URL | IdReference, "image">;
    /** Indicates a page (or other CreativeWork) for which this thing is the main entity being described. See {@link /docs/datamodel.html#mainEntityBackground background notes} for details. */
    "mainEntityOfPage"?: SchemaValue<CreativeWork | URL | IdReference, "mainEntityOfPage">;
    /** The name of the item. */
    "name"?: SchemaValue<Text, "name">;
    /** Indicates a potential Action, which describes an idealized action in which this thing would play an 'object' role. */
    "potentialAction"?: SchemaValue<Action | IdReference, "potentialAction">;
    /** URL of a reference Web page that unambiguously indicates the item's identity. E.g. the URL of the item's Wikipedia page, Wikidata entry, or official website. */
    "sameAs"?: SchemaValue<URL, "sameAs">;
    /** A CreativeWork or Event about this Thing. */
    "subjectOf"?: SchemaValue<CreativeWork | Event | IdReference, "subjectOf">;
    /** URL of the item. */
    "url"?: SchemaValue<URL, "url">;
}
interface ThingLeaf extends ThingBase {
    "@type": "Thing";
}
/** The most generic type of item. */
export type Thing = ThingLeaf | Action | BioChemEntity | CreativeWork | Event | Intangible | MedicalEntity | Organization | Person | Place | Product | StupidType | Taxon;
interface TicketBase extends ThingBase {
    /** The date the ticket was issued. */
    "dateIssued"?: SchemaValue<Date | DateTime, "dateIssued">;
    /** The organization issuing the item, for example a {@link https://schema.org/Permit Permit}, {@link https://schema.org/Ticket Ticket}, or {@link https://schema.org/Certification Certification}. */
    "issuedBy"?: SchemaValue<Organization | IdReference, "issuedBy">;
    /**
     * The currency of the price, or a price component when attached to {@link https://schema.org/PriceSpecification PriceSpecification} and its subtypes.
     *
     * Use standard formats: {@link http://en.wikipedia.org/wiki/ISO_4217 ISO 4217 currency format}, e.g. "USD"; {@link https://en.wikipedia.org/wiki/List_of_cryptocurrencies Ticker symbol} for cryptocurrencies, e.g. "BTC"; well known names for {@link https://en.wikipedia.org/wiki/Local_exchange_trading_system Local Exchange Trading Systems} (LETS) and other currency types, e.g. "Ithaca HOUR".
     */
    "priceCurrency"?: SchemaValue<Text, "priceCurrency">;
    /** The seat associated with the ticket. */
    "ticketedSeat"?: SchemaValue<Seat | IdReference, "ticketedSeat">;
    /** The unique identifier for the ticket. */
    "ticketNumber"?: SchemaValue<Text, "ticketNumber">;
    /** Reference to an asset (e.g., Barcode, QR code image or PDF) usable for entrance. */
    "ticketToken"?: SchemaValue<Text | URL, "ticketToken">;
    /**
     * The total price for the reservation or ticket, including applicable taxes, shipping, etc.
     *
     * Usage guidelines:
     * - Use values from 0123456789 (Unicode 'DIGIT ZERO' (U+0030) to 'DIGIT NINE' (U+0039)) rather than superficially similar Unicode symbols.
     * - Use '.' (Unicode 'FULL STOP' (U+002E)) rather than ',' to indicate a decimal point. Avoid using these symbols as a readability separator.
     */
    "totalPrice"?: SchemaValue<Number | PriceSpecification | Text | IdReference, "totalPrice">;
    /** The person or organization the reservation or ticket is for. */
    "underName"?: SchemaValue<Organization | Person | IdReference, "underName">;
}
interface TicketLeaf extends TicketBase {
    "@type": "Ticket";
}
/** Used to describe a ticket to an event, a flight, a bus ride, etc. */
export type Ticket = TicketLeaf;
interface TieActionLeaf extends ActionBase {
    "@type": "TieAction";
}
/** The act of reaching a draw in a competitive activity. */
export type TieAction = TieActionLeaf;
interface TierBenefitEnumerationLeaf extends EnumerationBase {
    "@type": "TierBenefitEnumeration";
}
/** An enumeration of possible benefits as part of a loyalty (members) program. */
export type TierBenefitEnumeration = "https://schema.org/TierBenefitLoyaltyPoints" | "TierBenefitLoyaltyPoints" | "https://schema.org/TierBenefitLoyaltyPrice" | "TierBenefitLoyaltyPrice" | "https://schema.org/TierBenefitLoyaltyReturns" | "TierBenefitLoyaltyReturns" | "https://schema.org/TierBenefitLoyaltyShipping" | "TierBenefitLoyaltyShipping" | TierBenefitEnumerationLeaf;
interface TipActionBase extends TradeActionBase {
    /** A sub property of participant. The participant who is at the receiving end of the action. */
    "recipient"?: SchemaValue<Audience | ContactPoint | Organization | Person | IdReference, "recipient">;
}
interface TipActionLeaf extends TipActionBase {
    "@type": "TipAction";
}
/** The act of giving money voluntarily to a beneficiary in recognition of services rendered. */
export type TipAction = TipActionLeaf;
interface TireShopLeaf extends LocalBusinessBase {
    "@type": "TireShop";
}
/** A tire shop. */
export type TireShop = TireShopLeaf | string;
interface TouristAttractionBase extends PlaceBase {
    /** A language someone may use with or at the item, service or place. Please use one of the language codes from the {@link http://tools.ietf.org/html/bcp47 IETF BCP 47 standard}. See also {@link https://schema.org/inLanguage inLanguage}. */
    "availableLanguage"?: SchemaValue<Language | Text | IdReference, "availableLanguage">;
    /** Attraction suitable for type(s) of tourist. E.g. children, visitors from a particular country, etc. */
    "touristType"?: SchemaValue<Audience | Text | IdReference, "touristType">;
}
interface TouristAttractionLeaf extends TouristAttractionBase {
    "@type": "TouristAttraction";
}
/** A tourist attraction. In principle any Thing can be a {@link https://schema.org/TouristAttraction TouristAttraction}, from a {@link https://schema.org/Mountain Mountain} and {@link https://schema.org/LandmarksOrHistoricalBuildings LandmarksOrHistoricalBuildings} to a {@link https://schema.org/LocalBusiness LocalBusiness}. This Type can be used on its own to describe a general {@link https://schema.org/TouristAttraction TouristAttraction}, or be used as an {@link https://schema.org/additionalType additionalType} to add tourist attraction properties to any other type. (See examples below) */
export type TouristAttraction = TouristAttractionLeaf | string;
interface TouristDestinationBase extends PlaceBase {
    /** Attraction located at destination. */
    "includesAttraction"?: SchemaValue<TouristAttraction | IdReference, "includesAttraction">;
    /** Attraction suitable for type(s) of tourist. E.g. children, visitors from a particular country, etc. */
    "touristType"?: SchemaValue<Audience | Text | IdReference, "touristType">;
}
interface TouristDestinationLeaf extends TouristDestinationBase {
    "@type": "TouristDestination";
}
/** A tourist destination. In principle any {@link https://schema.org/Place Place} can be a {@link https://schema.org/TouristDestination TouristDestination} from a {@link https://schema.org/City City}, Region or {@link https://schema.org/Country Country} to an {@link https://schema.org/AmusementPark AmusementPark} or {@link https://schema.org/Hotel Hotel}. This Type can be used on its own to describe a general {@link https://schema.org/TouristDestination TouristDestination}, or be used as an {@link https://schema.org/additionalType additionalType} to add tourist relevant properties to any other {@link https://schema.org/Place Place}. A {@link https://schema.org/TouristDestination TouristDestination} is defined as a {@link https://schema.org/Place Place} that contains, or is colocated with, one or more {@link https://schema.org/TouristAttraction TouristAttraction}s, often linked by a similar theme or interest to a particular {@link https://schema.org/touristType touristType}. The {@link http://www2.unwto.org/ UNWTO} defines Destination (main destination of a tourism trip) as the place visited that is central to the decision to take the trip. (See examples below.) */
export type TouristDestination = TouristDestinationLeaf | string;
interface TouristInformationCenterLeaf extends LocalBusinessBase {
    "@type": "TouristInformationCenter";
}
/** A tourist information center. */
export type TouristInformationCenter = TouristInformationCenterLeaf | string;
interface TouristTripBase extends TripBase {
    /** Attraction suitable for type(s) of tourist. E.g. children, visitors from a particular country, etc. */
    "touristType"?: SchemaValue<Audience | Text | IdReference, "touristType">;
}
interface TouristTripLeaf extends TouristTripBase {
    "@type": "TouristTrip";
}
/** A tourist trip. A created itinerary of visits to one or more places of interest ({@link https://schema.org/TouristAttraction TouristAttraction}/{@link https://schema.org/TouristDestination TouristDestination}) often linked by a similar theme, geographic area, or interest to a particular {@link https://schema.org/touristType touristType}. The {@link http://www2.unwto.org/ UNWTO} defines tourism trip as the Trip taken by visitors. (See examples below.) */
export type TouristTrip = TouristTripLeaf;
interface ToyStoreLeaf extends LocalBusinessBase {
    "@type": "ToyStore";
}
/** A toy store. */
export type ToyStore = ToyStoreLeaf | string;
interface TrackActionBase extends ActionBase {
    /** A sub property of instrument. The method of delivery. */
    "deliveryMethod"?: SchemaValue<DeliveryMethod | IdReference, "deliveryMethod">;
}
interface TrackActionLeaf extends TrackActionBase {
    "@type": "TrackAction";
}
/**
 * An agent tracks an object for updates.
 *
 * Related actions:
 * - {@link https://schema.org/FollowAction FollowAction}: Unlike FollowAction, TrackAction refers to the interest on the location of innanimates objects.
 * - {@link https://schema.org/SubscribeAction SubscribeAction}: Unlike SubscribeAction, TrackAction refers to the interest on the location of innanimate objects.
 */
export type TrackAction = TrackActionLeaf;
interface TradeActionBase extends ActionBase {
    /**
     * The offer price of a product, or of a price component when attached to PriceSpecification and its subtypes.
     *
     * Usage guidelines:
     * - Use the {@link https://schema.org/priceCurrency priceCurrency} property (with standard formats: {@link http://en.wikipedia.org/wiki/ISO_4217 ISO 4217 currency format}, e.g. "USD"; {@link https://en.wikipedia.org/wiki/List_of_cryptocurrencies Ticker symbol} for cryptocurrencies, e.g. "BTC"; well known names for {@link https://en.wikipedia.org/wiki/Local_exchange_trading_system Local Exchange Trading Systems} (LETS) and other currency types, e.g. "Ithaca HOUR") instead of including {@link http://en.wikipedia.org/wiki/Dollar_sign#Currencies_that_use_the_dollar_or_peso_sign ambiguous symbols} such as '$' in the value.
     * - Use '.' (Unicode 'FULL STOP' (U+002E)) rather than ',' to indicate a decimal point. Avoid using these symbols as a readability separator.
     * - Note that both {@link http://www.w3.org/TR/xhtml-rdfa-primer/#using-the-content-attribute RDFa} and Microdata syntax allow the use of a "content=" attribute for publishing simple machine-readable values alongside more human-friendly formatting.
     * - Use values from 0123456789 (Unicode 'DIGIT ZERO' (U+0030) to 'DIGIT NINE' (U+0039)) rather than superficially similar Unicode symbols.
     */
    "price"?: SchemaValue<Number | Text, "price">;
    /**
     * The currency of the price, or a price component when attached to {@link https://schema.org/PriceSpecification PriceSpecification} and its subtypes.
     *
     * Use standard formats: {@link http://en.wikipedia.org/wiki/ISO_4217 ISO 4217 currency format}, e.g. "USD"; {@link https://en.wikipedia.org/wiki/List_of_cryptocurrencies Ticker symbol} for cryptocurrencies, e.g. "BTC"; well known names for {@link https://en.wikipedia.org/wiki/Local_exchange_trading_system Local Exchange Trading Systems} (LETS) and other currency types, e.g. "Ithaca HOUR".
     */
    "priceCurrency"?: SchemaValue<Text, "priceCurrency">;
    /** One or more detailed price specifications, indicating the unit price and delivery or payment charges. */
    "priceSpecification"?: SchemaValue<PriceSpecification | IdReference, "priceSpecification">;
}
interface TradeActionLeaf extends TradeActionBase {
    "@type": "TradeAction";
}
/** The act of participating in an exchange of goods and services for monetary compensation. An agent trades an object, product or service with a participant in exchange for a one time or periodic payment. */
export type TradeAction = TradeActionLeaf | BuyAction | OrderAction | PayAction | PreOrderAction | QuoteAction | RentAction | SellAction | TipAction;
interface TrainReservationLeaf extends ReservationBase {
    "@type": "TrainReservation";
}
/**
 * A reservation for train travel.
 *
 * Note: This type is for information about actual reservations, e.g. in confirmation emails or HTML pages with individual confirmations of reservations. For offers of tickets, use {@link https://schema.org/Offer Offer}.
 */
export type TrainReservation = TrainReservationLeaf;
interface TrainStationLeaf extends CivicStructureBase {
    "@type": "TrainStation";
}
/** A train station. */
export type TrainStation = TrainStationLeaf | string;
interface TrainTripBase extends TripBase {
    /** The platform where the train arrives. */
    "arrivalPlatform"?: SchemaValue<Text, "arrivalPlatform">;
    /** The station where the train trip ends. */
    "arrivalStation"?: SchemaValue<TrainStation | IdReference, "arrivalStation">;
    /** The platform from which the train departs. */
    "departurePlatform"?: SchemaValue<Text, "departurePlatform">;
    /** The station from which the train departs. */
    "departureStation"?: SchemaValue<TrainStation | IdReference, "departureStation">;
    /** The name of the train (e.g. The Orient Express). */
    "trainName"?: SchemaValue<Text, "trainName">;
    /** The unique identifier for the train. */
    "trainNumber"?: SchemaValue<Text, "trainNumber">;
}
interface TrainTripLeaf extends TrainTripBase {
    "@type": "TrainTrip";
}
/** A trip on a commercial train line. */
export type TrainTrip = TrainTripLeaf;
interface TransferActionBase extends ActionBase {
    /** A sub property of location. The original location of the object or the agent before the action. */
    "fromLocation"?: SchemaValue<Place | IdReference, "fromLocation">;
    /** A sub property of location. The final location of the object or the agent after the action. */
    "toLocation"?: SchemaValue<Place | IdReference, "toLocation">;
}
interface TransferActionLeaf extends TransferActionBase {
    "@type": "TransferAction";
}
/** The act of transferring/moving (abstract or concrete) animate or inanimate objects from one place to another. */
export type TransferAction = TransferActionLeaf | BorrowAction | DonateAction | DownloadAction | GiveAction | LendAction | MoneyTransfer | ReceiveAction | ReturnAction | SendAction | TakeAction;
interface TravelActionBase extends MoveActionBase {
    /** The distance travelled, e.g. exercising or travelling. */
    "distance"?: SchemaValue<Distance | IdReference, "distance">;
}
interface TravelActionLeaf extends TravelActionBase {
    "@type": "TravelAction";
}
/** The act of traveling from a fromLocation to a destination by a specified mode of transport, optionally with participants. */
export type TravelAction = TravelActionLeaf;
interface TravelAgencyLeaf extends LocalBusinessBase {
    "@type": "TravelAgency";
}
/** A travel agency. */
export type TravelAgency = TravelAgencyLeaf | string;
interface TreatmentIndicationLeaf extends MedicalEntityBase {
    "@type": "TreatmentIndication";
}
/** An indication for treating an underlying condition, symptom, etc. */
export type TreatmentIndication = TreatmentIndicationLeaf;
interface TripBase extends ThingBase {
    /** The expected arrival time. */
    "arrivalTime"?: SchemaValue<DateTime | Time, "arrivalTime">;
    /** The expected departure time. */
    "departureTime"?: SchemaValue<DateTime | Time, "departureTime">;
    /** Destination(s) ( {@link https://schema.org/Place Place} ) that make up a trip. For a trip where destination order is important use {@link https://schema.org/ItemList ItemList} to specify that order (see examples). */
    "itinerary"?: SchemaValue<ItemList | Place | IdReference, "itinerary">;
    /** An offer to provide this item—for example, an offer to sell a product, rent the DVD of a movie, perform a service, or give away tickets to an event. Use {@link https://schema.org/businessFunction businessFunction} to indicate the kind of transaction offered, i.e. sell, lease, etc. This property can also be used to describe a {@link https://schema.org/Demand Demand}. While this property is listed as expected on a number of common types, it can be used in others. In that case, using a second type, such as Product or a subtype of Product, can clarify the nature of the offer. */
    "offers"?: SchemaValue<Demand | Offer | IdReference, "offers">;
    /** Identifies that this {@link https://schema.org/Trip Trip} is a subTrip of another Trip. For example Day 1, Day 2, etc. of a multi-day trip. */
    "partOfTrip"?: SchemaValue<Trip | IdReference, "partOfTrip">;
    /** The service provider, service operator, or service performer; the goods producer. Another party (a seller) may offer those services or goods on behalf of the provider. A provider may also serve as the seller. */
    "provider"?: SchemaValue<Organization | Person | IdReference, "provider">;
    /** Identifies a {@link https://schema.org/Trip Trip} that is a subTrip of this Trip. For example Day 1, Day 2, etc. of a multi-day trip. */
    "subTrip"?: SchemaValue<Trip | IdReference, "subTrip">;
    /** The location of origin of the trip, prior to any destination(s). */
    "tripOrigin"?: SchemaValue<Place | IdReference, "tripOrigin">;
}
interface TripLeaf extends TripBase {
    "@type": "Trip";
}
/** A trip or journey. An itinerary of visits to one or more places. */
export type Trip = TripLeaf | BoatTrip | BusTrip | Flight | TouristTrip | TrainTrip;
interface TVClipBase extends ClipBase {
    /**
     * The TV series to which this episode or season belongs.
     *
     * @deprecated Consider using https://schema.org/partOfSeries instead.
     */
    "partOfTVSeries"?: SchemaValue<TVSeries | IdReference, "partOfTVSeries">;
}
interface TVClipLeaf extends TVClipBase {
    "@type": "TVClip";
}
/** A short TV program or a segment/part of a TV program. */
export type TVClip = TVClipLeaf;
interface TVEpisodeBase extends EpisodeBase {
    /**
     * The country of origin of something, including products as well as creative works such as movie and TV content.
     *
     * In the case of TV and movie, this would be the country of the principle offices of the production company or individual responsible for the movie. For other kinds of {@link https://schema.org/CreativeWork CreativeWork} it is difficult to provide fully general guidance, and properties such as {@link https://schema.org/contentLocation contentLocation} and {@link https://schema.org/locationCreated locationCreated} may be more applicable.
     *
     * In the case of products, the country of origin of the product. The exact interpretation of this may vary by context and product type, and cannot be fully enumerated here.
     */
    "countryOfOrigin"?: SchemaValue<Country | IdReference, "countryOfOrigin">;
    /**
     * The TV series to which this episode or season belongs.
     *
     * @deprecated Consider using https://schema.org/partOfSeries instead.
     */
    "partOfTVSeries"?: SchemaValue<TVSeries | IdReference, "partOfTVSeries">;
    /** Languages in which subtitles/captions are available, in {@link http://tools.ietf.org/html/bcp47 IETF BCP 47 standard format}. */
    "subtitleLanguage"?: SchemaValue<Language | Text | IdReference, "subtitleLanguage">;
    /**
     * An {@link https://eidr.org/ EIDR} (Entertainment Identifier Registry) {@link https://schema.org/identifier identifier} representing at the most general/abstract level, a work of film or television.
     *
     * For example, the motion picture known as "Ghostbusters" has a titleEIDR of "10.5240/7EC7-228A-510A-053E-CBB8-J". This title (or work) may have several variants, which EIDR calls "edits". See {@link https://schema.org/editEIDR editEIDR}.
     *
     * Since schema.org types like {@link https://schema.org/Movie Movie}, {@link https://schema.org/TVEpisode TVEpisode}, {@link https://schema.org/TVSeason TVSeason}, and {@link https://schema.org/TVSeries TVSeries} can be used for both works and their multiple expressions, it is possible to use {@link https://schema.org/titleEIDR titleEIDR} alone (for a general description), or alongside {@link https://schema.org/editEIDR editEIDR} for a more edit-specific description.
     */
    "titleEIDR"?: SchemaValue<Text | URL, "titleEIDR">;
}
interface TVEpisodeLeaf extends TVEpisodeBase {
    "@type": "TVEpisode";
}
/** A TV episode which can be part of a series or season. */
export type TVEpisode = TVEpisodeLeaf;
interface TVSeasonBase extends CreativeWorkBase, CreativeWorkSeasonBase {
    /**
     * The country of origin of something, including products as well as creative works such as movie and TV content.
     *
     * In the case of TV and movie, this would be the country of the principle offices of the production company or individual responsible for the movie. For other kinds of {@link https://schema.org/CreativeWork CreativeWork} it is difficult to provide fully general guidance, and properties such as {@link https://schema.org/contentLocation contentLocation} and {@link https://schema.org/locationCreated locationCreated} may be more applicable.
     *
     * In the case of products, the country of origin of the product. The exact interpretation of this may vary by context and product type, and cannot be fully enumerated here.
     */
    "countryOfOrigin"?: SchemaValue<Country | IdReference, "countryOfOrigin">;
    /**
     * The TV series to which this episode or season belongs.
     *
     * @deprecated Consider using https://schema.org/partOfSeries instead.
     */
    "partOfTVSeries"?: SchemaValue<TVSeries | IdReference, "partOfTVSeries">;
    /**
     * An {@link https://eidr.org/ EIDR} (Entertainment Identifier Registry) {@link https://schema.org/identifier identifier} representing at the most general/abstract level, a work of film or television.
     *
     * For example, the motion picture known as "Ghostbusters" has a titleEIDR of "10.5240/7EC7-228A-510A-053E-CBB8-J". This title (or work) may have several variants, which EIDR calls "edits". See {@link https://schema.org/editEIDR editEIDR}.
     *
     * Since schema.org types like {@link https://schema.org/Movie Movie}, {@link https://schema.org/TVEpisode TVEpisode}, {@link https://schema.org/TVSeason TVSeason}, and {@link https://schema.org/TVSeries TVSeries} can be used for both works and their multiple expressions, it is possible to use {@link https://schema.org/titleEIDR titleEIDR} alone (for a general description), or alongside {@link https://schema.org/editEIDR editEIDR} for a more edit-specific description.
     */
    "titleEIDR"?: SchemaValue<Text | URL, "titleEIDR">;
}
interface TVSeasonLeaf extends TVSeasonBase {
    "@type": "TVSeason";
}
/** Season dedicated to TV broadcast and associated online delivery. */
export type TVSeason = TVSeasonLeaf;
interface TVSeriesBase extends CreativeWorkBase, CreativeWorkSeriesBase {
    /** An actor (individual or a group), e.g. in TV, radio, movie, video games etc., or in an event. Actors can be associated with individual items or with a series, episode, clip. */
    "actor"?: SchemaValue<PerformingGroup | Person | IdReference, "actor">;
    /**
     * An actor, e.g. in TV, radio, movie, video games etc. Actors can be associated with individual items or with a series, episode, clip.
     *
     * @deprecated Consider using https://schema.org/actor instead.
     */
    "actors"?: SchemaValue<Person | IdReference, "actors">;
    /** A season that is part of the media series. */
    "containsSeason"?: SchemaValue<CreativeWorkSeason | IdReference, "containsSeason">;
    /**
     * The country of origin of something, including products as well as creative works such as movie and TV content.
     *
     * In the case of TV and movie, this would be the country of the principle offices of the production company or individual responsible for the movie. For other kinds of {@link https://schema.org/CreativeWork CreativeWork} it is difficult to provide fully general guidance, and properties such as {@link https://schema.org/contentLocation contentLocation} and {@link https://schema.org/locationCreated locationCreated} may be more applicable.
     *
     * In the case of products, the country of origin of the product. The exact interpretation of this may vary by context and product type, and cannot be fully enumerated here.
     */
    "countryOfOrigin"?: SchemaValue<Country | IdReference, "countryOfOrigin">;
    /** A director of e.g. TV, radio, movie, video gaming etc. content, or of an event. Directors can be associated with individual items or with a series, episode, clip. */
    "director"?: SchemaValue<Person | IdReference, "director">;
    /**
     * A director of e.g. TV, radio, movie, video games etc. content. Directors can be associated with individual items or with a series, episode, clip.
     *
     * @deprecated Consider using https://schema.org/director instead.
     */
    "directors"?: SchemaValue<Person | IdReference, "directors">;
    /** An episode of a TV, radio or game media within a series or season. */
    "episode"?: SchemaValue<Episode | IdReference, "episode">;
    /**
     * An episode of a TV/radio series or season.
     *
     * @deprecated Consider using https://schema.org/episode instead.
     */
    "episodes"?: SchemaValue<Episode | IdReference, "episodes">;
    /** The composer of the soundtrack. */
    "musicBy"?: SchemaValue<MusicGroup | Person | IdReference, "musicBy">;
    /** The number of episodes in this season or series. */
    "numberOfEpisodes"?: SchemaValue<Integer, "numberOfEpisodes">;
    /** The number of seasons in this series. */
    "numberOfSeasons"?: SchemaValue<Integer, "numberOfSeasons">;
    /** The production company or studio responsible for the item, e.g. series, video game, episode etc. */
    "productionCompany"?: SchemaValue<Organization | IdReference, "productionCompany">;
    /**
     * A season in a media series.
     *
     * @deprecated Consider using https://schema.org/containsSeason instead.
     */
    "season"?: SchemaValue<CreativeWorkSeason | URL | IdReference, "season">;
    /**
     * A season in a media series.
     *
     * @deprecated Consider using https://schema.org/season instead.
     */
    "seasons"?: SchemaValue<CreativeWorkSeason | IdReference, "seasons">;
    /**
     * An {@link https://eidr.org/ EIDR} (Entertainment Identifier Registry) {@link https://schema.org/identifier identifier} representing at the most general/abstract level, a work of film or television.
     *
     * For example, the motion picture known as "Ghostbusters" has a titleEIDR of "10.5240/7EC7-228A-510A-053E-CBB8-J". This title (or work) may have several variants, which EIDR calls "edits". See {@link https://schema.org/editEIDR editEIDR}.
     *
     * Since schema.org types like {@link https://schema.org/Movie Movie}, {@link https://schema.org/TVEpisode TVEpisode}, {@link https://schema.org/TVSeason TVSeason}, and {@link https://schema.org/TVSeries TVSeries} can be used for both works and their multiple expressions, it is possible to use {@link https://schema.org/titleEIDR titleEIDR} alone (for a general description), or alongside {@link https://schema.org/editEIDR editEIDR} for a more edit-specific description.
     */
    "titleEIDR"?: SchemaValue<Text | URL, "titleEIDR">;
    /** The trailer of a movie or TV/radio series, season, episode, etc. */
    "trailer"?: SchemaValue<VideoObject | IdReference, "trailer">;
}
interface TVSeriesLeaf extends TVSeriesBase {
    "@type": "TVSeries";
}
/** CreativeWorkSeries dedicated to TV broadcast and associated online delivery. */
export type TVSeries = TVSeriesLeaf;
interface TypeAndQuantityNodeBase extends ThingBase {
    /** The quantity of the goods included in the offer. */
    "amountOfThisGood"?: SchemaValue<Number, "amountOfThisGood">;
    /** The business function (e.g. sell, lease, repair, dispose) of the offer or component of a bundle (TypeAndQuantityNode). The default is http://purl.org/goodrelations/v1#Sell. */
    "businessFunction"?: SchemaValue<BusinessFunction | IdReference, "businessFunction">;
    /** The product that this structured value is referring to. */
    "typeOfGood"?: SchemaValue<Product | Service | IdReference, "typeOfGood">;
    /** The unit of measurement given using the UN/CEFACT Common Code (3 characters) or a URL. Other codes than the UN/CEFACT Common Code may be used with a prefix followed by a colon. */
    "unitCode"?: SchemaValue<Text | URL, "unitCode">;
    /** A string or text indicating the unit of measurement. Useful if you cannot provide a standard unit code for {@link unitCode unitCode}. */
    "unitText"?: SchemaValue<Text, "unitText">;
}
interface TypeAndQuantityNodeLeaf extends TypeAndQuantityNodeBase {
    "@type": "TypeAndQuantityNode";
}
/** A structured value indicating the quantity, unit of measurement, and business function of goods included in a bundle offer. */
export type TypeAndQuantityNode = TypeAndQuantityNodeLeaf;
interface UKNonprofitTypeLeaf extends EnumerationBase {
    "@type": "UKNonprofitType";
}
/** UKNonprofitType: Non-profit organization type originating from the United Kingdom. */
export type UKNonprofitType = "https://schema.org/CharitableIncorporatedOrganization" | "CharitableIncorporatedOrganization" | "https://schema.org/LimitedByGuaranteeCharity" | "LimitedByGuaranteeCharity" | "https://schema.org/UKTrust" | "UKTrust" | "https://schema.org/UnincorporatedAssociationCharity" | "UnincorporatedAssociationCharity" | UKNonprofitTypeLeaf;
interface UnitPriceSpecificationBase extends PriceSpecificationBase {
    /** Specifies for how long this price (or price component) will be billed. Can be used, for example, to model the contractual duration of a subscription or payment plan. Type can be either a Duration or a Number (in which case the unit of measurement, for example month, is specified by the unitCode property). */
    "billingDuration"?: SchemaValue<Duration | Number | QuantitativeValue | IdReference, "billingDuration">;
    /** This property specifies the minimal quantity and rounding increment that will be the basis for the billing. The unit of measurement is specified by the unitCode property. */
    "billingIncrement"?: SchemaValue<Number, "billingIncrement">;
    /** Specifies after how much time this price (or price component) becomes valid and billing starts. Can be used, for example, to model a price increase after the first year of a subscription. The unit of measurement is specified by the unitCode property. */
    "billingStart"?: SchemaValue<Number, "billingStart">;
    /** Identifies a price component (for example, a line item on an invoice), part of the total price for an offer. */
    "priceComponentType"?: SchemaValue<PriceComponentTypeEnumeration | IdReference, "priceComponentType">;
    /** Defines the type of a price specified for an offered product, for example a list price, a (temporary) sale price or a manufacturer suggested retail price. If multiple prices are specified for an offer the {@link https://schema.org/priceType priceType} property can be used to identify the type of each such specified price. The value of priceType can be specified as a value from enumeration PriceTypeEnumeration or as a free form text string for price types that are not already predefined in PriceTypeEnumeration. */
    "priceType"?: SchemaValue<PriceTypeEnumeration | Text | IdReference, "priceType">;
    /** The reference quantity for which a certain price applies, e.g. 1 EUR per 4 kWh of electricity. This property is a replacement for unitOfMeasurement for the advanced cases where the price does not relate to a standard unit. */
    "referenceQuantity"?: SchemaValue<QuantitativeValue | IdReference, "referenceQuantity">;
    /** The unit of measurement given using the UN/CEFACT Common Code (3 characters) or a URL. Other codes than the UN/CEFACT Common Code may be used with a prefix followed by a colon. */
    "unitCode"?: SchemaValue<Text | URL, "unitCode">;
    /** A string or text indicating the unit of measurement. Useful if you cannot provide a standard unit code for {@link unitCode unitCode}. */
    "unitText"?: SchemaValue<Text, "unitText">;
}
interface UnitPriceSpecificationLeaf extends UnitPriceSpecificationBase {
    "@type": "UnitPriceSpecification";
}
/** The price asked for a given offer by the respective organization or person. */
export type UnitPriceSpecification = UnitPriceSpecificationLeaf;
interface UnRegisterActionLeaf extends ActionBase {
    "@type": "UnRegisterAction";
}
/**
 * The act of un-registering from a service.
 *
 * Related actions:
 * - {@link https://schema.org/RegisterAction RegisterAction}: antonym of UnRegisterAction.
 * - {@link https://schema.org/LeaveAction LeaveAction}: Unlike LeaveAction, UnRegisterAction implies that you are unregistering from a service you were previously registered, rather than leaving a team/group of people.
 */
export type UnRegisterAction = UnRegisterActionLeaf;
interface UpdateActionBase extends ActionBase {
    /**
     * A sub property of object. The collection target of the action.
     *
     * @deprecated Consider using https://schema.org/targetCollection instead.
     */
    "collection"?: SchemaValue<Thing | IdReference, "collection">;
    /** A sub property of object. The collection target of the action. */
    "targetCollection"?: SchemaValue<Thing | IdReference, "targetCollection">;
}
interface UpdateActionLeaf extends UpdateActionBase {
    "@type": "UpdateAction";
}
/** The act of managing by changing/editing the state of the object. */
export type UpdateAction = UpdateActionLeaf | AddAction | DeleteAction | ReplaceAction;
/** Data type: URL. */
export type URL = string;
interface UseActionLeaf extends ConsumeActionBase {
    "@type": "UseAction";
}
/** The act of applying an object to its intended purpose. */
export type UseAction = UseActionLeaf | WearAction;
interface UserBlocksLeaf extends EventBase {
    "@type": "UserBlocks";
}
/**
 * UserInteraction and its subtypes is an old way of talking about users interacting with pages. It is generally better to use {@link https://schema.org/Action Action}-based vocabulary, alongside types such as {@link https://schema.org/Comment Comment}.
 *
 * @deprecated Use InteractionCounter instead.
 */
export type UserBlocks = UserBlocksLeaf;
interface UserCheckinsLeaf extends EventBase {
    "@type": "UserCheckins";
}
/**
 * UserInteraction and its subtypes is an old way of talking about users interacting with pages. It is generally better to use {@link https://schema.org/Action Action}-based vocabulary, alongside types such as {@link https://schema.org/Comment Comment}.
 *
 * @deprecated Use InteractionCounter instead.
 */
export type UserCheckins = UserCheckinsLeaf;
interface UserCommentsBase extends EventBase {
    /** The text of the UserComment. */
    "commentText"?: SchemaValue<Text, "commentText">;
    /** The time at which the UserComment was made. */
    "commentTime"?: SchemaValue<Date | DateTime, "commentTime">;
    /** The creator/author of this CreativeWork. This is the same as the Author property for CreativeWork. */
    "creator"?: SchemaValue<Organization | Person | IdReference, "creator">;
    /** Specifies the CreativeWork associated with the UserComment. */
    "discusses"?: SchemaValue<CreativeWork | IdReference, "discusses">;
    /** The URL at which a reply may be posted to the specified UserComment. */
    "replyToUrl"?: SchemaValue<URL, "replyToUrl">;
}
interface UserCommentsLeaf extends UserCommentsBase {
    "@type": "UserComments";
}
/**
 * UserInteraction and its subtypes is an old way of talking about users interacting with pages. It is generally better to use {@link https://schema.org/Action Action}-based vocabulary, alongside types such as {@link https://schema.org/Comment Comment}.
 *
 * @deprecated Use InteractionCounter instead.
 */
export type UserComments = UserCommentsLeaf;
interface UserDownloadsLeaf extends EventBase {
    "@type": "UserDownloads";
}
/**
 * UserInteraction and its subtypes is an old way of talking about users interacting with pages. It is generally better to use {@link https://schema.org/Action Action}-based vocabulary, alongside types such as {@link https://schema.org/Comment Comment}.
 *
 * @deprecated Use InteractionCounter instead.
 */
export type UserDownloads = UserDownloadsLeaf;
interface UserInteractionLeaf extends EventBase {
    "@type": "UserInteraction";
}
/**
 * UserInteraction and its subtypes is an old way of talking about users interacting with pages. It is generally better to use {@link https://schema.org/Action Action}-based vocabulary, alongside types such as {@link https://schema.org/Comment Comment}.
 *
 * @deprecated Use InteractionCounter instead.
 */
export type UserInteraction = UserInteractionLeaf | UserBlocks | UserCheckins | UserComments | UserDownloads | UserLikes | UserPageVisits | UserPlays | UserPlusOnes | UserTweets;
interface UserLikesLeaf extends EventBase {
    "@type": "UserLikes";
}
/**
 * UserInteraction and its subtypes is an old way of talking about users interacting with pages. It is generally better to use {@link https://schema.org/Action Action}-based vocabulary, alongside types such as {@link https://schema.org/Comment Comment}.
 *
 * @deprecated Use InteractionCounter instead.
 */
export type UserLikes = UserLikesLeaf;
interface UserPageVisitsLeaf extends EventBase {
    "@type": "UserPageVisits";
}
/**
 * UserInteraction and its subtypes is an old way of talking about users interacting with pages. It is generally better to use {@link https://schema.org/Action Action}-based vocabulary, alongside types such as {@link https://schema.org/Comment Comment}.
 *
 * @deprecated Use InteractionCounter instead.
 */
export type UserPageVisits = UserPageVisitsLeaf;
interface UserPlaysLeaf extends EventBase {
    "@type": "UserPlays";
}
/**
 * UserInteraction and its subtypes is an old way of talking about users interacting with pages. It is generally better to use {@link https://schema.org/Action Action}-based vocabulary, alongside types such as {@link https://schema.org/Comment Comment}.
 *
 * @deprecated Use InteractionCounter instead.
 */
export type UserPlays = UserPlaysLeaf;
interface UserPlusOnesLeaf extends EventBase {
    "@type": "UserPlusOnes";
}
/**
 * UserInteraction and its subtypes is an old way of talking about users interacting with pages. It is generally better to use {@link https://schema.org/Action Action}-based vocabulary, alongside types such as {@link https://schema.org/Comment Comment}.
 *
 * @deprecated Use InteractionCounter instead.
 */
export type UserPlusOnes = UserPlusOnesLeaf;
interface UserReviewLeaf extends ReviewBase {
    "@type": "UserReview";
}
/** A review created by an end-user (e.g. consumer, purchaser, attendee etc.), in contrast with {@link https://schema.org/CriticReview CriticReview}. */
export type UserReview = UserReviewLeaf;
interface UserTweetsLeaf extends EventBase {
    "@type": "UserTweets";
}
/**
 * UserInteraction and its subtypes is an old way of talking about users interacting with pages. It is generally better to use {@link https://schema.org/Action Action}-based vocabulary, alongside types such as {@link https://schema.org/Comment Comment}.
 *
 * @deprecated Use InteractionCounter instead.
 */
export type UserTweets = UserTweetsLeaf;
interface USNonprofitTypeLeaf extends EnumerationBase {
    "@type": "USNonprofitType";
}
/** USNonprofitType: Non-profit organization type originating from the United States. */
export type USNonprofitType = "https://schema.org/Nonprofit501a" | "Nonprofit501a" | "https://schema.org/Nonprofit501c1" | "Nonprofit501c1" | "https://schema.org/Nonprofit501c10" | "Nonprofit501c10" | "https://schema.org/Nonprofit501c11" | "Nonprofit501c11" | "https://schema.org/Nonprofit501c12" | "Nonprofit501c12" | "https://schema.org/Nonprofit501c13" | "Nonprofit501c13" | "https://schema.org/Nonprofit501c14" | "Nonprofit501c14" | "https://schema.org/Nonprofit501c15" | "Nonprofit501c15" | "https://schema.org/Nonprofit501c16" | "Nonprofit501c16" | "https://schema.org/Nonprofit501c17" | "Nonprofit501c17" | "https://schema.org/Nonprofit501c18" | "Nonprofit501c18" | "https://schema.org/Nonprofit501c19" | "Nonprofit501c19" | "https://schema.org/Nonprofit501c2" | "Nonprofit501c2" | "https://schema.org/Nonprofit501c20" | "Nonprofit501c20" | "https://schema.org/Nonprofit501c21" | "Nonprofit501c21" | "https://schema.org/Nonprofit501c22" | "Nonprofit501c22" | "https://schema.org/Nonprofit501c23" | "Nonprofit501c23" | "https://schema.org/Nonprofit501c24" | "Nonprofit501c24" | "https://schema.org/Nonprofit501c25" | "Nonprofit501c25" | "https://schema.org/Nonprofit501c26" | "Nonprofit501c26" | "https://schema.org/Nonprofit501c27" | "Nonprofit501c27" | "https://schema.org/Nonprofit501c28" | "Nonprofit501c28" | "https://schema.org/Nonprofit501c3" | "Nonprofit501c3" | "https://schema.org/Nonprofit501c4" | "Nonprofit501c4" | "https://schema.org/Nonprofit501c5" | "Nonprofit501c5" | "https://schema.org/Nonprofit501c6" | "Nonprofit501c6" | "https://schema.org/Nonprofit501c7" | "Nonprofit501c7" | "https://schema.org/Nonprofit501c8" | "Nonprofit501c8" | "https://schema.org/Nonprofit501c9" | "Nonprofit501c9" | "https://schema.org/Nonprofit501d" | "Nonprofit501d" | "https://schema.org/Nonprofit501e" | "Nonprofit501e" | "https://schema.org/Nonprofit501f" | "Nonprofit501f" | "https://schema.org/Nonprofit501k" | "Nonprofit501k" | "https://schema.org/Nonprofit501n" | "Nonprofit501n" | "https://schema.org/Nonprofit501q" | "Nonprofit501q" | "https://schema.org/Nonprofit527" | "Nonprofit527" | USNonprofitTypeLeaf;
interface VacationRentalLeaf extends LodgingBusinessBase {
    "@type": "VacationRental";
}
/** A kind of lodging business that focuses on renting single properties for limited time. */
export type VacationRental = VacationRentalLeaf | string;
interface VehicleBase extends ProductBase {
    /**
     * The time needed to accelerate the vehicle from a given start velocity to a given target velocity.
     *
     * Typical unit code(s): SEC for seconds
     * - Note: There are unfortunately no standard unit codes for seconds/0..100 km/h or seconds/0..60 mph. Simply use "SEC" for seconds and indicate the velocities in the {@link https://schema.org/name name} of the {@link https://schema.org/QuantitativeValue QuantitativeValue}, or use {@link https://schema.org/valueReference valueReference} with a {@link https://schema.org/QuantitativeValue QuantitativeValue} of 0..60 mph or 0..100 km/h to specify the reference speeds.
     */
    "accelerationTime"?: SchemaValue<QuantitativeValue | IdReference, "accelerationTime">;
    /** Indicates the design and body style of the vehicle (e.g. station wagon, hatchback, etc.). */
    "bodyType"?: SchemaValue<QualitativeValue | Text | URL | IdReference, "bodyType">;
    /** A {@link https://en.wikipedia.org/wiki/Call_sign callsign}, as used in broadcasting and radio communications to identify people, radio and TV stations, or vehicles. */
    "callSign"?: SchemaValue<Text, "callSign">;
    /**
     * The available volume for cargo or luggage. For automobiles, this is usually the trunk volume.
     *
     * Typical unit code(s): LTR for liters, FTQ for cubic foot/feet
     *
     * Note: You can use {@link https://schema.org/minValue minValue} and {@link https://schema.org/maxValue maxValue} to indicate ranges.
     */
    "cargoVolume"?: SchemaValue<QuantitativeValue | IdReference, "cargoVolume">;
    /** The date of the first registration of the vehicle with the respective public authorities. */
    "dateVehicleFirstRegistered"?: SchemaValue<Date, "dateVehicleFirstRegistered">;
    /** The drive wheel configuration, i.e. which roadwheels will receive torque from the vehicle's engine via the drivetrain. */
    "driveWheelConfiguration"?: SchemaValue<DriveWheelConfigurationValue | Text | IdReference, "driveWheelConfiguration">;
    /** The CO2 emissions in g/km. When used in combination with a QuantitativeValue, put "g/km" into the unitText property of that value, since there is no UN/CEFACT Common Code for "g/km". */
    "emissionsCO2"?: SchemaValue<Number, "emissionsCO2">;
    /**
     * The capacity of the fuel tank or in the case of electric cars, the battery. If there are multiple components for storage, this should indicate the total of all storage of the same type.
     *
     * Typical unit code(s): LTR for liters, GLL of US gallons, GLI for UK / imperial gallons, AMH for ampere-hours (for electrical vehicles).
     */
    "fuelCapacity"?: SchemaValue<QuantitativeValue | IdReference, "fuelCapacity">;
    /**
     * The amount of fuel consumed for traveling a particular distance or temporal duration with the given vehicle (e.g. liters per 100 km).
     * - Note 1: There are unfortunately no standard unit codes for liters per 100 km. Use {@link https://schema.org/unitText unitText} to indicate the unit of measurement, e.g. L/100 km.
     * - Note 2: There are two ways of indicating the fuel consumption, {@link https://schema.org/fuelConsumption fuelConsumption} (e.g. 8 liters per 100 km) and {@link https://schema.org/fuelEfficiency fuelEfficiency} (e.g. 30 miles per gallon). They are reciprocal.
     * - Note 3: Often, the absolute value is useful only when related to driving speed ("at 80 km/h") or usage pattern ("city traffic"). You can use {@link https://schema.org/valueReference valueReference} to link the value for the fuel consumption to another value.
     */
    "fuelConsumption"?: SchemaValue<QuantitativeValue | IdReference, "fuelConsumption">;
    /**
     * The distance traveled per unit of fuel used; most commonly miles per gallon (mpg) or kilometers per liter (km/L).
     * - Note 1: There are unfortunately no standard unit codes for miles per gallon or kilometers per liter. Use {@link https://schema.org/unitText unitText} to indicate the unit of measurement, e.g. mpg or km/L.
     * - Note 2: There are two ways of indicating the fuel consumption, {@link https://schema.org/fuelConsumption fuelConsumption} (e.g. 8 liters per 100 km) and {@link https://schema.org/fuelEfficiency fuelEfficiency} (e.g. 30 miles per gallon). They are reciprocal.
     * - Note 3: Often, the absolute value is useful only when related to driving speed ("at 80 km/h") or usage pattern ("city traffic"). You can use {@link https://schema.org/valueReference valueReference} to link the value for the fuel economy to another value.
     */
    "fuelEfficiency"?: SchemaValue<QuantitativeValue | IdReference, "fuelEfficiency">;
    /** The type of fuel suitable for the engine or engines of the vehicle. If the vehicle has only one engine, this property can be attached directly to the vehicle. */
    "fuelType"?: SchemaValue<QualitativeValue | Text | URL | IdReference, "fuelType">;
    /** A textual description of known damages, both repaired and unrepaired. */
    "knownVehicleDamages"?: SchemaValue<Text, "knownVehicleDamages">;
    /** Indicates that the vehicle meets the respective emission standard. */
    "meetsEmissionStandard"?: SchemaValue<QualitativeValue | Text | URL | IdReference, "meetsEmissionStandard">;
    /**
     * The total distance travelled by the particular vehicle since its initial production, as read from its odometer.
     *
     * Typical unit code(s): KMT for kilometers, SMI for statute miles.
     */
    "mileageFromOdometer"?: SchemaValue<QuantitativeValue | IdReference, "mileageFromOdometer">;
    /** The release date of a vehicle model (often used to differentiate versions of the same make and model). */
    "modelDate"?: SchemaValue<Date, "modelDate">;
    /** The number or type of airbags in the vehicle. */
    "numberOfAirbags"?: SchemaValue<Number | Text, "numberOfAirbags">;
    /**
     * The number of axles.
     *
     * Typical unit code(s): C62.
     */
    "numberOfAxles"?: SchemaValue<Number | QuantitativeValue | IdReference, "numberOfAxles">;
    /**
     * The number of doors.
     *
     * Typical unit code(s): C62.
     */
    "numberOfDoors"?: SchemaValue<Number | QuantitativeValue | IdReference, "numberOfDoors">;
    /**
     * The total number of forward gears available for the transmission system of the vehicle.
     *
     * Typical unit code(s): C62.
     */
    "numberOfForwardGears"?: SchemaValue<Number | QuantitativeValue | IdReference, "numberOfForwardGears">;
    /**
     * The number of owners of the vehicle, including the current one.
     *
     * Typical unit code(s): C62.
     */
    "numberOfPreviousOwners"?: SchemaValue<Number | QuantitativeValue | IdReference, "numberOfPreviousOwners">;
    /**
     * The permitted weight of passengers and cargo, EXCLUDING the weight of the empty vehicle.
     *
     * Typical unit code(s): KGM for kilogram, LBR for pound
     * - Note 1: Many databases specify the permitted TOTAL weight instead, which is the sum of {@link https://schema.org/weight weight} and {@link https://schema.org/payload payload}
     * - Note 2: You can indicate additional information in the {@link https://schema.org/name name} of the {@link https://schema.org/QuantitativeValue QuantitativeValue} node.
     * - Note 3: You may also link to a {@link https://schema.org/QualitativeValue QualitativeValue} node that provides additional information using {@link https://schema.org/valueReference valueReference}.
     * - Note 4: Note that you can use {@link https://schema.org/minValue minValue} and {@link https://schema.org/maxValue maxValue} to indicate ranges.
     */
    "payload"?: SchemaValue<QuantitativeValue | IdReference, "payload">;
    /** The date of production of the item, e.g. vehicle. */
    "productionDate"?: SchemaValue<Date, "productionDate">;
    /** The date the item, e.g. vehicle, was purchased by the current owner. */
    "purchaseDate"?: SchemaValue<Date, "purchaseDate">;
    /**
     * The number of persons that can be seated (e.g. in a vehicle), both in terms of the physical space available, and in terms of limitations set by law.
     *
     * Typical unit code(s): C62 for persons.
     */
    "seatingCapacity"?: SchemaValue<Number | QuantitativeValue | IdReference, "seatingCapacity">;
    /**
     * The speed range of the vehicle. If the vehicle is powered by an engine, the upper limit of the speed range (indicated by {@link https://schema.org/maxValue maxValue}) should be the maximum speed achievable under regular conditions.
     *
     * Typical unit code(s): KMH for km/h, HM for mile per hour (0.447 04 m/s), KNT for knot
     *
     * *Note 1: Use {@link https://schema.org/minValue minValue} and {@link https://schema.org/maxValue maxValue} to indicate the range. Typically, the minimal value is zero.
     * - Note 2: There are many different ways of measuring the speed range. You can link to information about how the given value has been determined using the {@link https://schema.org/valueReference valueReference} property.
     */
    "speed"?: SchemaValue<QuantitativeValue | IdReference, "speed">;
    /** The position of the steering wheel or similar device (mostly for cars). */
    "steeringPosition"?: SchemaValue<SteeringPositionValue | IdReference, "steeringPosition">;
    /** This is a StupidProperty! - for testing only. */
    "stupidProperty"?: SchemaValue<QuantitativeValue | IdReference, "stupidProperty">;
    /**
     * The permitted vertical load (TWR) of a trailer attached to the vehicle. Also referred to as Tongue Load Rating (TLR) or Vertical Load Rating (VLR).
     *
     * Typical unit code(s): KGM for kilogram, LBR for pound
     * - Note 1: You can indicate additional information in the {@link https://schema.org/name name} of the {@link https://schema.org/QuantitativeValue QuantitativeValue} node.
     * - Note 2: You may also link to a {@link https://schema.org/QualitativeValue QualitativeValue} node that provides additional information using {@link https://schema.org/valueReference valueReference}.
     * - Note 3: Note that you can use {@link https://schema.org/minValue minValue} and {@link https://schema.org/maxValue maxValue} to indicate ranges.
     */
    "tongueWeight"?: SchemaValue<QuantitativeValue | IdReference, "tongueWeight">;
    /**
     * The permitted weight of a trailer attached to the vehicle.
     *
     * Typical unit code(s): KGM for kilogram, LBR for pound
     * - Note 1: You can indicate additional information in the {@link https://schema.org/name name} of the {@link https://schema.org/QuantitativeValue QuantitativeValue} node.
     * - Note 2: You may also link to a {@link https://schema.org/QualitativeValue QualitativeValue} node that provides additional information using {@link https://schema.org/valueReference valueReference}.
     * - Note 3: Note that you can use {@link https://schema.org/minValue minValue} and {@link https://schema.org/maxValue maxValue} to indicate ranges.
     */
    "trailerWeight"?: SchemaValue<QuantitativeValue | IdReference, "trailerWeight">;
    /** A short text indicating the configuration of the vehicle, e.g. '5dr hatchback ST 2.5 MT 225 hp' or 'limited edition'. */
    "vehicleConfiguration"?: SchemaValue<Text, "vehicleConfiguration">;
    /** Information about the engine or engines of the vehicle. */
    "vehicleEngine"?: SchemaValue<EngineSpecification | IdReference, "vehicleEngine">;
    /** The Vehicle Identification Number (VIN) is a unique serial number used by the automotive industry to identify individual motor vehicles. */
    "vehicleIdentificationNumber"?: SchemaValue<Text, "vehicleIdentificationNumber">;
    /** The color or color combination of the interior of the vehicle. */
    "vehicleInteriorColor"?: SchemaValue<Text, "vehicleInteriorColor">;
    /** The type or material of the interior of the vehicle (e.g. synthetic fabric, leather, wood, etc.). While most interior types are characterized by the material used, an interior type can also be based on vehicle usage or target audience. */
    "vehicleInteriorType"?: SchemaValue<Text, "vehicleInteriorType">;
    /** The release date of a vehicle model (often used to differentiate versions of the same make and model). */
    "vehicleModelDate"?: SchemaValue<Date, "vehicleModelDate">;
    /**
     * The number of passengers that can be seated in the vehicle, both in terms of the physical space available, and in terms of limitations set by law.
     *
     * Typical unit code(s): C62 for persons.
     */
    "vehicleSeatingCapacity"?: SchemaValue<Number | QuantitativeValue | IdReference, "vehicleSeatingCapacity">;
    /** Indicates whether the vehicle has been used for special purposes, like commercial rental, driving school, or as a taxi. The legislation in many countries requires this information to be revealed when offering a car for sale. */
    "vehicleSpecialUsage"?: SchemaValue<CarUsageType | Text | IdReference, "vehicleSpecialUsage">;
    /** The type of component used for transmitting the power from a rotating power source to the wheels or other relevant component(s) ("gearbox" for cars). */
    "vehicleTransmission"?: SchemaValue<QualitativeValue | Text | URL | IdReference, "vehicleTransmission">;
    /**
     * The permitted total weight of the loaded vehicle, including passengers and cargo and the weight of the empty vehicle.
     *
     * Typical unit code(s): KGM for kilogram, LBR for pound
     * - Note 1: You can indicate additional information in the {@link https://schema.org/name name} of the {@link https://schema.org/QuantitativeValue QuantitativeValue} node.
     * - Note 2: You may also link to a {@link https://schema.org/QualitativeValue QualitativeValue} node that provides additional information using {@link https://schema.org/valueReference valueReference}.
     * - Note 3: Note that you can use {@link https://schema.org/minValue minValue} and {@link https://schema.org/maxValue maxValue} to indicate ranges.
     */
    "weightTotal"?: SchemaValue<QuantitativeValue | IdReference, "weightTotal">;
    /**
     * The distance between the centers of the front and rear wheels.
     *
     * Typical unit code(s): CMT for centimeters, MTR for meters, INH for inches, FOT for foot/feet.
     */
    "wheelbase"?: SchemaValue<QuantitativeValue | IdReference, "wheelbase">;
}
interface VehicleLeaf extends VehicleBase {
    "@type": "Vehicle";
}
/** A vehicle is a device that is designed or used to transport people or cargo over land, water, air, or through space. */
export type Vehicle = VehicleLeaf | BusOrCoach | Car | Motorcycle | MotorizedBicycle;
interface VeinBase extends AnatomicalStructureBase {
    /** The vasculature that the vein drains into. */
    "drainsTo"?: SchemaValue<Vessel | IdReference, "drainsTo">;
    /** The anatomical or organ system drained by this vessel; generally refers to a specific part of an organ. */
    "regionDrained"?: SchemaValue<AnatomicalStructure | AnatomicalSystem | IdReference, "regionDrained">;
    /** The anatomical or organ system that the vein flows into; a larger structure that the vein connects to. */
    "tributary"?: SchemaValue<AnatomicalStructure | IdReference, "tributary">;
}
interface VeinLeaf extends VeinBase {
    "@type": "Vein";
}
/** A type of blood vessel that specifically carries blood to the heart. */
export type Vein = VeinLeaf;
interface VesselLeaf extends AnatomicalStructureBase {
    "@type": "Vessel";
}
/** A component of the human body circulatory system comprised of an intricate network of hollow tubes that transport blood throughout the entire body. */
export type Vessel = VesselLeaf | Artery | LymphaticVessel | Vein;
interface VeterinaryCareLeaf extends MedicalOrganizationBase {
    "@type": "VeterinaryCare";
}
/** A vet's office. */
export type VeterinaryCare = VeterinaryCareLeaf | string;
interface VideoGalleryLeaf extends WebPageBase {
    "@type": "VideoGallery";
}
/** Web page type: Video gallery page. */
export type VideoGallery = VideoGalleryLeaf;
interface VideoGameBase extends SoftwareApplicationBase, GameBase {
    /** An actor (individual or a group), e.g. in TV, radio, movie, video games etc., or in an event. Actors can be associated with individual items or with a series, episode, clip. */
    "actor"?: SchemaValue<PerformingGroup | Person | IdReference, "actor">;
    /**
     * An actor, e.g. in TV, radio, movie, video games etc. Actors can be associated with individual items or with a series, episode, clip.
     *
     * @deprecated Consider using https://schema.org/actor instead.
     */
    "actors"?: SchemaValue<Person | IdReference, "actors">;
    /** Cheat codes to the game. */
    "cheatCode"?: SchemaValue<CreativeWork | IdReference, "cheatCode">;
    /** A director of e.g. TV, radio, movie, video gaming etc. content, or of an event. Directors can be associated with individual items or with a series, episode, clip. */
    "director"?: SchemaValue<Person | IdReference, "director">;
    /**
     * A director of e.g. TV, radio, movie, video games etc. content. Directors can be associated with individual items or with a series, episode, clip.
     *
     * @deprecated Consider using https://schema.org/director instead.
     */
    "directors"?: SchemaValue<Person | IdReference, "directors">;
    /** The edition of a video game. */
    "gameEdition"?: SchemaValue<Text, "gameEdition">;
    /** The electronic systems used to play {@link http://en.wikipedia.org/wiki/Category:Video_game_platforms video games}. */
    "gamePlatform"?: SchemaValue<Text | Thing | URL | IdReference, "gamePlatform">;
    /** The server on which it is possible to play the game. */
    "gameServer"?: SchemaValue<GameServer | IdReference, "gameServer">;
    /** Links to tips, tactics, etc. */
    "gameTip"?: SchemaValue<CreativeWork | IdReference, "gameTip">;
    /** The composer of the soundtrack. */
    "musicBy"?: SchemaValue<MusicGroup | Person | IdReference, "musicBy">;
    /** Indicates whether this game is multi-player, co-op or single-player. The game can be marked as multi-player, co-op and single-player at the same time. */
    "playMode"?: SchemaValue<GamePlayMode | IdReference, "playMode">;
    /** The trailer of a movie or TV/radio series, season, episode, etc. */
    "trailer"?: SchemaValue<VideoObject | IdReference, "trailer">;
}
interface VideoGameLeaf extends VideoGameBase {
    "@type": "VideoGame";
}
/** A video game is an electronic game that involves human interaction with a user interface to generate visual feedback on a video device. */
export type VideoGame = VideoGameLeaf;
interface VideoGameClipLeaf extends ClipBase {
    "@type": "VideoGameClip";
}
/** A short segment/part of a video game. */
export type VideoGameClip = VideoGameClipLeaf;
interface VideoGameSeriesBase extends CreativeWorkSeriesBase {
    /** An actor (individual or a group), e.g. in TV, radio, movie, video games etc., or in an event. Actors can be associated with individual items or with a series, episode, clip. */
    "actor"?: SchemaValue<PerformingGroup | Person | IdReference, "actor">;
    /**
     * An actor, e.g. in TV, radio, movie, video games etc. Actors can be associated with individual items or with a series, episode, clip.
     *
     * @deprecated Consider using https://schema.org/actor instead.
     */
    "actors"?: SchemaValue<Person | IdReference, "actors">;
    /** A piece of data that represents a particular aspect of a fictional character (skill, power, character points, advantage, disadvantage). */
    "characterAttribute"?: SchemaValue<Thing | IdReference, "characterAttribute">;
    /** Cheat codes to the game. */
    "cheatCode"?: SchemaValue<CreativeWork | IdReference, "cheatCode">;
    /** A season that is part of the media series. */
    "containsSeason"?: SchemaValue<CreativeWorkSeason | IdReference, "containsSeason">;
    /** A director of e.g. TV, radio, movie, video gaming etc. content, or of an event. Directors can be associated with individual items or with a series, episode, clip. */
    "director"?: SchemaValue<Person | IdReference, "director">;
    /**
     * A director of e.g. TV, radio, movie, video games etc. content. Directors can be associated with individual items or with a series, episode, clip.
     *
     * @deprecated Consider using https://schema.org/director instead.
     */
    "directors"?: SchemaValue<Person | IdReference, "directors">;
    /** An episode of a TV, radio or game media within a series or season. */
    "episode"?: SchemaValue<Episode | IdReference, "episode">;
    /**
     * An episode of a TV/radio series or season.
     *
     * @deprecated Consider using https://schema.org/episode instead.
     */
    "episodes"?: SchemaValue<Episode | IdReference, "episodes">;
    /** An item is an object within the game world that can be collected by a player or, occasionally, a non-player character. */
    "gameItem"?: SchemaValue<Thing | IdReference, "gameItem">;
    /** Real or fictional location of the game (or part of game). */
    "gameLocation"?: SchemaValue<Place | PostalAddress | URL | IdReference, "gameLocation">;
    /** The electronic systems used to play {@link http://en.wikipedia.org/wiki/Category:Video_game_platforms video games}. */
    "gamePlatform"?: SchemaValue<Text | Thing | URL | IdReference, "gamePlatform">;
    /** The composer of the soundtrack. */
    "musicBy"?: SchemaValue<MusicGroup | Person | IdReference, "musicBy">;
    /** The number of episodes in this season or series. */
    "numberOfEpisodes"?: SchemaValue<Integer, "numberOfEpisodes">;
    /** Indicate how many people can play this game (minimum, maximum, or range). */
    "numberOfPlayers"?: SchemaValue<QuantitativeValue | IdReference, "numberOfPlayers">;
    /** The number of seasons in this series. */
    "numberOfSeasons"?: SchemaValue<Integer, "numberOfSeasons">;
    /** Indicates whether this game is multi-player, co-op or single-player. The game can be marked as multi-player, co-op and single-player at the same time. */
    "playMode"?: SchemaValue<GamePlayMode | IdReference, "playMode">;
    /** The production company or studio responsible for the item, e.g. series, video game, episode etc. */
    "productionCompany"?: SchemaValue<Organization | IdReference, "productionCompany">;
    /** The task that a player-controlled character, or group of characters may complete in order to gain a reward. */
    "quest"?: SchemaValue<Thing | IdReference, "quest">;
    /**
     * A season in a media series.
     *
     * @deprecated Consider using https://schema.org/containsSeason instead.
     */
    "season"?: SchemaValue<CreativeWorkSeason | URL | IdReference, "season">;
    /**
     * A season in a media series.
     *
     * @deprecated Consider using https://schema.org/season instead.
     */
    "seasons"?: SchemaValue<CreativeWorkSeason | IdReference, "seasons">;
    /** The trailer of a movie or TV/radio series, season, episode, etc. */
    "trailer"?: SchemaValue<VideoObject | IdReference, "trailer">;
}
interface VideoGameSeriesLeaf extends VideoGameSeriesBase {
    "@type": "VideoGameSeries";
}
/** A video game series. */
export type VideoGameSeries = VideoGameSeriesLeaf;
interface VideoObjectBase extends MediaObjectBase {
    /** An actor (individual or a group), e.g. in TV, radio, movie, video games etc., or in an event. Actors can be associated with individual items or with a series, episode, clip. */
    "actor"?: SchemaValue<PerformingGroup | Person | IdReference, "actor">;
    /**
     * An actor, e.g. in TV, radio, movie, video games etc. Actors can be associated with individual items or with a series, episode, clip.
     *
     * @deprecated Consider using https://schema.org/actor instead.
     */
    "actors"?: SchemaValue<Person | IdReference, "actors">;
    /** The caption for this object. For downloadable machine formats (closed caption, subtitles etc.) use MediaObject and indicate the {@link https://schema.org/encodingFormat encodingFormat}. */
    "caption"?: SchemaValue<MediaObject | Text | IdReference, "caption">;
    /** A director of e.g. TV, radio, movie, video gaming etc. content, or of an event. Directors can be associated with individual items or with a series, episode, clip. */
    "director"?: SchemaValue<Person | IdReference, "director">;
    /**
     * A director of e.g. TV, radio, movie, video games etc. content. Directors can be associated with individual items or with a series, episode, clip.
     *
     * @deprecated Consider using https://schema.org/director instead.
     */
    "directors"?: SchemaValue<Person | IdReference, "directors">;
    /** Represents textual captioning from a {@link https://schema.org/MediaObject MediaObject}, e.g. text of a 'meme'. */
    "embeddedTextCaption"?: SchemaValue<Text, "embeddedTextCaption">;
    /** The composer of the soundtrack. */
    "musicBy"?: SchemaValue<MusicGroup | Person | IdReference, "musicBy">;
    /** If this MediaObject is an AudioObject or VideoObject, the transcript of that object. */
    "transcript"?: SchemaValue<Text, "transcript">;
    /** The frame size of the video. */
    "videoFrameSize"?: SchemaValue<Text, "videoFrameSize">;
    /** The quality of the video. */
    "videoQuality"?: SchemaValue<Text, "videoQuality">;
}
interface VideoObjectLeaf extends VideoObjectBase {
    "@type": "VideoObject";
}
/** A video file. */
export type VideoObject = VideoObjectLeaf | VideoObjectSnapshot;
interface VideoObjectSnapshotLeaf extends VideoObjectBase {
    "@type": "VideoObjectSnapshot";
}
/** A specific and exact (byte-for-byte) version of a {@link https://schema.org/VideoObject VideoObject}. Two byte-for-byte identical files, for the purposes of this type, considered identical. If they have different embedded metadata the files will differ. Different external facts about the files, e.g. creator or dateCreated that aren't represented in their actual content, do not affect this notion of identity. */
export type VideoObjectSnapshot = VideoObjectSnapshotLeaf;
interface ViewActionLeaf extends ConsumeActionBase {
    "@type": "ViewAction";
}
/** The act of consuming static visual content. */
export type ViewAction = ViewActionLeaf;
interface VirtualLocationLeaf extends ThingBase {
    "@type": "VirtualLocation";
}
/** An online or virtual location for attending events. For example, one may attend an online seminar or educational event. While a virtual location may be used as the location of an event, virtual locations should not be confused with physical locations in the real world. */
export type VirtualLocation = VirtualLocationLeaf;
interface VisualArtsEventLeaf extends EventBase {
    "@type": "VisualArtsEvent";
}
/** Event type: Visual arts event. */
export type VisualArtsEvent = VisualArtsEventLeaf;
interface VisualArtworkBase extends CreativeWorkBase {
    /** The number of copies when multiple copies of a piece of artwork are produced - e.g. for a limited edition of 20 prints, 'artEdition' refers to the total number of copies (in this example "20"). */
    "artEdition"?: SchemaValue<Integer | Text, "artEdition">;
    /** e.g. Painting, Drawing, Sculpture, Print, Photograph, Assemblage, Collage, etc. */
    "artform"?: SchemaValue<Text | URL, "artform">;
    /** The primary artist for a work in a medium other than pencils or digital line art--for example, if the primary artwork is done in watercolors or digital paints. */
    "artist"?: SchemaValue<Person | IdReference, "artist">;
    /** The material used. (E.g. Oil, Watercolour, Acrylic, Linoprint, Marble, Cyanotype, Digital, Lithograph, DryPoint, Intaglio, Pastel, Woodcut, Pencil, Mixed Media, etc.) */
    "artMedium"?: SchemaValue<Text | URL, "artMedium">;
    /** The supporting materials for the artwork, e.g. Canvas, Paper, Wood, Board, etc. */
    "artworkSurface"?: SchemaValue<Text | URL, "artworkSurface">;
    /** The individual who adds color to inked drawings. */
    "colorist"?: SchemaValue<Person | IdReference, "colorist">;
    /** The depth of the item. */
    "depth"?: SchemaValue<Distance | QuantitativeValue | IdReference, "depth">;
    /** The height of the item. */
    "height"?: SchemaValue<Distance | QuantitativeValue | IdReference, "height">;
    /** The individual who traces over the pencil drawings in ink after pencils are complete. */
    "inker"?: SchemaValue<Person | IdReference, "inker">;
    /** The individual who adds lettering, including speech balloons and sound effects, to artwork. */
    "letterer"?: SchemaValue<Person | IdReference, "letterer">;
    /** The individual who draws the primary narrative artwork. */
    "penciler"?: SchemaValue<Person | IdReference, "penciler">;
    /**
     * A material used as a surface in some artwork, e.g. Canvas, Paper, Wood, Board, etc.
     *
     * @deprecated Consider using https://schema.org/artworkSurface instead.
     */
    "surface"?: SchemaValue<Text | URL, "surface">;
    /** The weight of the product or person. */
    "weight"?: SchemaValue<QuantitativeValue | IdReference, "weight">;
    /** The width of the item. */
    "width"?: SchemaValue<Distance | QuantitativeValue | IdReference, "width">;
}
interface VisualArtworkLeaf extends VisualArtworkBase {
    "@type": "VisualArtwork";
}
/** A work of art that is primarily visual in character. */
export type VisualArtwork = VisualArtworkLeaf | CoverArt;
interface VitalSignLeaf extends MedicalSignBase {
    "@type": "VitalSign";
}
/** Vital signs are measures of various physiological functions in order to assess the most basic body functions. */
export type VitalSign = VitalSignLeaf;
interface VolcanoLeaf extends PlaceBase {
    "@type": "Volcano";
}
/** A volcano, like Fujisan. */
export type Volcano = VolcanoLeaf | string;
interface VoteActionBase extends ChooseActionBase {
    /** A sub property of object. The candidate subject of this action. */
    "candidate"?: SchemaValue<Person | IdReference, "candidate">;
}
interface VoteActionLeaf extends VoteActionBase {
    "@type": "VoteAction";
}
/** The act of expressing a preference from a fixed/finite/structured set of choices/options. */
export type VoteAction = VoteActionLeaf;
interface WantActionLeaf extends ActionBase {
    "@type": "WantAction";
}
/** The act of expressing a desire about the object. An agent wants an object. */
export type WantAction = WantActionLeaf;
interface WarrantyPromiseBase extends ThingBase {
    /** The duration of the warranty promise. Common unitCode values are ANN for year, MON for months, or DAY for days. */
    "durationOfWarranty"?: SchemaValue<QuantitativeValue | IdReference, "durationOfWarranty">;
    /** The scope of the warranty promise. */
    "warrantyScope"?: SchemaValue<WarrantyScope | IdReference, "warrantyScope">;
}
interface WarrantyPromiseLeaf extends WarrantyPromiseBase {
    "@type": "WarrantyPromise";
}
/** A structured value representing the duration and scope of services that will be provided to a customer free of charge in case of a defect or malfunction of a product. */
export type WarrantyPromise = WarrantyPromiseLeaf;
interface WarrantyScopeLeaf extends EnumerationBase {
    "@type": "WarrantyScope";
}
/**
 * A range of services that will be provided to a customer free of charge in case of a defect or malfunction of a product.
 *
 * Commonly used values:
 * - http://purl.org/goodrelations/v1#Labor-BringIn
 * - http://purl.org/goodrelations/v1#PartsAndLabor-BringIn
 * - http://purl.org/goodrelations/v1#PartsAndLabor-PickUp
 */
export type WarrantyScope = WarrantyScopeLeaf;
interface WatchActionLeaf extends ConsumeActionBase {
    "@type": "WatchAction";
}
/** The act of consuming dynamic/moving visual content. */
export type WatchAction = WatchActionLeaf;
interface WaterfallLeaf extends PlaceBase {
    "@type": "Waterfall";
}
/** A waterfall, like Niagara. */
export type Waterfall = WaterfallLeaf | string;
interface WearableMeasurementTypeEnumerationLeaf extends EnumerationBase {
    "@type": "WearableMeasurementTypeEnumeration";
}
/** Enumerates common types of measurement for wearables products. */
export type WearableMeasurementTypeEnumeration = "https://schema.org/WearableMeasurementBack" | "WearableMeasurementBack" | "https://schema.org/WearableMeasurementChestOrBust" | "WearableMeasurementChestOrBust" | "https://schema.org/WearableMeasurementCollar" | "WearableMeasurementCollar" | "https://schema.org/WearableMeasurementCup" | "WearableMeasurementCup" | "https://schema.org/WearableMeasurementHeight" | "WearableMeasurementHeight" | "https://schema.org/WearableMeasurementHips" | "WearableMeasurementHips" | "https://schema.org/WearableMeasurementInseam" | "WearableMeasurementInseam" | "https://schema.org/WearableMeasurementLength" | "WearableMeasurementLength" | "https://schema.org/WearableMeasurementOutsideLeg" | "WearableMeasurementOutsideLeg" | "https://schema.org/WearableMeasurementSleeve" | "WearableMeasurementSleeve" | "https://schema.org/WearableMeasurementWaist" | "WearableMeasurementWaist" | "https://schema.org/WearableMeasurementWidth" | "WearableMeasurementWidth" | WearableMeasurementTypeEnumerationLeaf;
interface WearableSizeGroupEnumerationLeaf extends EnumerationBase {
    "@type": "WearableSizeGroupEnumeration";
}
/** Enumerates common size groups (also known as "size types") for wearable products. */
export type WearableSizeGroupEnumeration = "https://schema.org/WearableSizeGroupBig" | "WearableSizeGroupBig" | "https://schema.org/WearableSizeGroupBoys" | "WearableSizeGroupBoys" | "https://schema.org/WearableSizeGroupExtraShort" | "WearableSizeGroupExtraShort" | "https://schema.org/WearableSizeGroupExtraTall" | "WearableSizeGroupExtraTall" | "https://schema.org/WearableSizeGroupGirls" | "WearableSizeGroupGirls" | "https://schema.org/WearableSizeGroupHusky" | "WearableSizeGroupHusky" | "https://schema.org/WearableSizeGroupInfants" | "WearableSizeGroupInfants" | "https://schema.org/WearableSizeGroupJuniors" | "WearableSizeGroupJuniors" | "https://schema.org/WearableSizeGroupMaternity" | "WearableSizeGroupMaternity" | "https://schema.org/WearableSizeGroupMens" | "WearableSizeGroupMens" | "https://schema.org/WearableSizeGroupMisses" | "WearableSizeGroupMisses" | "https://schema.org/WearableSizeGroupPetite" | "WearableSizeGroupPetite" | "https://schema.org/WearableSizeGroupPlus" | "WearableSizeGroupPlus" | "https://schema.org/WearableSizeGroupRegular" | "WearableSizeGroupRegular" | "https://schema.org/WearableSizeGroupShort" | "WearableSizeGroupShort" | "https://schema.org/WearableSizeGroupTall" | "WearableSizeGroupTall" | "https://schema.org/WearableSizeGroupWomens" | "WearableSizeGroupWomens" | WearableSizeGroupEnumerationLeaf;
interface WearableSizeSystemEnumerationLeaf extends EnumerationBase {
    "@type": "WearableSizeSystemEnumeration";
}
/** Enumerates common size systems specific for wearable products. */
export type WearableSizeSystemEnumeration = "https://schema.org/WearableSizeSystemAU" | "WearableSizeSystemAU" | "https://schema.org/WearableSizeSystemBR" | "WearableSizeSystemBR" | "https://schema.org/WearableSizeSystemCN" | "WearableSizeSystemCN" | "https://schema.org/WearableSizeSystemContinental" | "WearableSizeSystemContinental" | "https://schema.org/WearableSizeSystemDE" | "WearableSizeSystemDE" | "https://schema.org/WearableSizeSystemEN13402" | "WearableSizeSystemEN13402" | "https://schema.org/WearableSizeSystemEurope" | "WearableSizeSystemEurope" | "https://schema.org/WearableSizeSystemFR" | "WearableSizeSystemFR" | "https://schema.org/WearableSizeSystemGS1" | "WearableSizeSystemGS1" | "https://schema.org/WearableSizeSystemIT" | "WearableSizeSystemIT" | "https://schema.org/WearableSizeSystemJP" | "WearableSizeSystemJP" | "https://schema.org/WearableSizeSystemMX" | "WearableSizeSystemMX" | "https://schema.org/WearableSizeSystemUK" | "WearableSizeSystemUK" | "https://schema.org/WearableSizeSystemUS" | "WearableSizeSystemUS" | WearableSizeSystemEnumerationLeaf;
interface WearActionLeaf extends ConsumeActionBase {
    "@type": "WearAction";
}
/** The act of dressing oneself in clothing. */
export type WearAction = WearActionLeaf;
interface WebAPIBase extends ServiceBase {
    /** Further documentation describing the Web API in more detail. */
    "documentation"?: SchemaValue<CreativeWork | URL | IdReference, "documentation">;
}
interface WebAPILeaf extends WebAPIBase {
    "@type": "WebAPI";
}
/** An application programming interface accessible over Web/Internet technologies. */
export type WebAPI = WebAPILeaf;
interface WebApplicationBase extends SoftwareApplicationBase {
    /** Specifies browser requirements in human-readable text. For example, 'requires HTML5 support'. */
    "browserRequirements"?: SchemaValue<Text, "browserRequirements">;
}
interface WebApplicationLeaf extends WebApplicationBase {
    "@type": "WebApplication";
}
/** Web applications. */
export type WebApplication = WebApplicationLeaf;
interface WebContentLeaf extends CreativeWorkBase {
    "@type": "WebContent";
}
/** WebContent is a type representing all {@link https://schema.org/WebPage WebPage}, {@link https://schema.org/WebSite WebSite} and {@link https://schema.org/WebPageElement WebPageElement} content. It is sometimes the case that detailed distinctions between Web pages, sites and their parts are not always important or obvious. The {@link https://schema.org/WebContent WebContent} type makes it easier to describe Web-addressable content without requiring such distinctions to always be stated. (The intent is that the existing types {@link https://schema.org/WebPage WebPage}, {@link https://schema.org/WebSite WebSite} and {@link https://schema.org/WebPageElement WebPageElement} will eventually be declared as subtypes of {@link https://schema.org/WebContent WebContent}.) */
export type WebContent = WebContentLeaf | HealthTopicContent;
interface WebPageBase extends CreativeWorkBase {
    /** A set of links that can help a user understand and navigate a website hierarchy. */
    "breadcrumb"?: SchemaValue<BreadcrumbList | Text | IdReference, "breadcrumb">;
    /** Date on which the content on this web page was last reviewed for accuracy and/or completeness. */
    "lastReviewed"?: SchemaValue<Date, "lastReviewed">;
    /** Indicates if this web page element is the main subject of the page. */
    "mainContentOfPage"?: SchemaValue<WebPageElement | IdReference, "mainContentOfPage">;
    /** Indicates the main image on the page. */
    "primaryImageOfPage"?: SchemaValue<ImageObject | IdReference, "primaryImageOfPage">;
    /** A link related to this web page, for example to other related web pages. */
    "relatedLink"?: SchemaValue<URL, "relatedLink">;
    /** People or organizations that have reviewed the content on this web page for accuracy and/or completeness. */
    "reviewedBy"?: SchemaValue<Organization | Person | IdReference, "reviewedBy">;
    /** One of the more significant URLs on the page. Typically, these are the non-navigation links that are clicked on the most. */
    "significantLink"?: SchemaValue<URL, "significantLink">;
    /**
     * The most significant URLs on the page. Typically, these are the non-navigation links that are clicked on the most.
     *
     * @deprecated Consider using https://schema.org/significantLink instead.
     */
    "significantLinks"?: SchemaValue<URL, "significantLinks">;
    /**
     * Indicates sections of a Web page that are particularly 'speakable' in the sense of being highlighted as being especially appropriate for text-to-speech conversion. Other sections of a page may also be usefully spoken in particular circumstances; the 'speakable' property serves to indicate the parts most likely to be generally useful for speech.
     *
     * The _speakable_ property can be repeated an arbitrary number of times, with three kinds of possible 'content-locator' values:
     *
     * 1.) _id-value_ URL references - uses _id-value_ of an element in the page being annotated. The simplest use of _speakable_ has (potentially relative) URL values, referencing identified sections of the document concerned.
     *
     * 2.) CSS Selectors - addresses content in the annotated page, e.g. via class attribute. Use the {@link https://schema.org/cssSelector cssSelector} property.
     *
     * 3.) XPaths - addresses content via XPaths (assuming an XML view of the content). Use the {@link https://schema.org/xpath xpath} property.
     *
     * For more sophisticated markup of speakable sections beyond simple ID references, either CSS selectors or XPath expressions to pick out document section(s) as speakable. For this we define a supporting type, {@link https://schema.org/SpeakableSpecification SpeakableSpecification} which is defined to be a possible value of the _speakable_ property.
     */
    "speakable"?: SchemaValue<SpeakableSpecification | URL | IdReference, "speakable">;
    /** One of the domain specialities to which this web page's content applies. */
    "specialty"?: SchemaValue<Specialty | IdReference, "specialty">;
}
interface WebPageLeaf extends WebPageBase {
    "@type": "WebPage";
}
/** A web page. Every web page is implicitly assumed to be declared to be of type WebPage, so the various properties about that webpage, such as `breadcrumb` may be used. We recommend explicit declaration if these properties are specified, but if they are found outside of an itemscope, they will be assumed to be about the page. */
export type WebPage = WebPageLeaf | AboutPage | CheckoutPage | CollectionPage | ContactPage | FAQPage | ItemPage | MedicalWebPage | ProfilePage | QAPage | RealEstateListing | SearchResultsPage;
interface WebPageElementBase extends CreativeWorkBase {
    /** A CSS selector, e.g. of a {@link https://schema.org/SpeakableSpecification SpeakableSpecification} or {@link https://schema.org/WebPageElement WebPageElement}. In the latter case, multiple matches within a page can constitute a single conceptual "Web page element". */
    "cssSelector"?: SchemaValue<CssSelectorType, "cssSelector">;
    /** An XPath, e.g. of a {@link https://schema.org/SpeakableSpecification SpeakableSpecification} or {@link https://schema.org/WebPageElement WebPageElement}. In the latter case, multiple matches within a page can constitute a single conceptual "Web page element". */
    "xpath"?: SchemaValue<XPathType, "xpath">;
}
interface WebPageElementLeaf extends WebPageElementBase {
    "@type": "WebPageElement";
}
/** A web page element, like a table or an image. */
export type WebPageElement = WebPageElementLeaf | SiteNavigationElement | Table | WPAdBlock | WPFooter | WPHeader | WPSideBar;
interface WebSiteBase extends CreativeWorkBase {
    /** The International Standard Serial Number (ISSN) that identifies this serial publication. You can repeat this property to identify different formats of, or the linking ISSN (ISSN-L) for, this serial publication. */
    "issn"?: SchemaValue<Text, "issn">;
}
interface WebSiteLeaf extends WebSiteBase {
    "@type": "WebSite";
}
/** A WebSite is a set of related web pages and other items typically served from a single web domain and accessible via URLs. */
export type WebSite = WebSiteLeaf;
interface WholesaleStoreLeaf extends LocalBusinessBase {
    "@type": "WholesaleStore";
}
/** A wholesale store. */
export type WholesaleStore = WholesaleStoreLeaf | string;
interface WinActionBase extends ActionBase {
    /** A sub property of participant. The loser of the action. */
    "loser"?: SchemaValue<Person | IdReference, "loser">;
}
interface WinActionLeaf extends WinActionBase {
    "@type": "WinAction";
}
/** The act of achieving victory in a competitive activity. */
export type WinAction = WinActionLeaf;
interface WineryLeaf extends FoodEstablishmentBase {
    "@type": "Winery";
}
/** A winery. */
export type Winery = WineryLeaf | string;
interface WorkBasedProgramBase extends EducationalOccupationalProgramBase {
    /**
     * A category describing the job, preferably using a term from a taxonomy such as {@link http://www.onetcenter.org/taxonomy.html BLS O*NET-SOC}, {@link https://www.ilo.org/public/english/bureau/stat/isco/isco08/ ISCO-08} or similar, with the property repeated for each applicable value. Ideally the taxonomy should be identified, and both the textual label and formal code for the category should be provided.
     *
     * Note: for historical reasons, any textual label and formal code provided as a literal may be assumed to be from O*NET-SOC.
     */
    "occupationalCategory"?: SchemaValue<CategoryCode | Text | IdReference, "occupationalCategory">;
    /** The estimated salary earned while in the program. */
    "trainingSalary"?: SchemaValue<MonetaryAmountDistribution | IdReference, "trainingSalary">;
}
interface WorkBasedProgramLeaf extends WorkBasedProgramBase {
    "@type": "WorkBasedProgram";
}
/** A program with both an educational and employment component. Typically based at a workplace and structured around work-based learning, with the aim of instilling competencies related to an occupation. WorkBasedProgram is used to distinguish programs such as apprenticeships from school, college or other classroom based educational programs. */
export type WorkBasedProgram = WorkBasedProgramLeaf;
interface WorkersUnionLeaf extends OrganizationBase {
    "@type": "WorkersUnion";
}
/** A Workers Union (also known as a Labor Union, Labour Union, or Trade Union) is an organization that promotes the interests of its worker members by collectively bargaining with management, organizing, and political lobbying. */
export type WorkersUnion = WorkersUnionLeaf | string;
interface WPAdBlockLeaf extends WebPageElementBase {
    "@type": "WPAdBlock";
}
/** An advertising section of the page. */
export type WPAdBlock = WPAdBlockLeaf;
interface WPFooterLeaf extends WebPageElementBase {
    "@type": "WPFooter";
}
/** The footer section of the page. */
export type WPFooter = WPFooterLeaf;
interface WPHeaderLeaf extends WebPageElementBase {
    "@type": "WPHeader";
}
/** The header section of the page. */
export type WPHeader = WPHeaderLeaf;
interface WPSideBarLeaf extends WebPageElementBase {
    "@type": "WPSideBar";
}
/** A sidebar section of the page. */
export type WPSideBar = WPSideBarLeaf;
interface WriteActionBase extends ActionBase {
    /** The language of the content or performance or used in an action. Please use one of the language codes from the {@link http://tools.ietf.org/html/bcp47 IETF BCP 47 standard}. See also {@link https://schema.org/availableLanguage availableLanguage}. */
    "inLanguage"?: SchemaValue<Language | Text | IdReference, "inLanguage">;
    /**
     * A sub property of instrument. The language used on this action.
     *
     * @deprecated Consider using https://schema.org/inLanguage instead.
     */
    "language"?: SchemaValue<Language | IdReference, "language">;
}
interface WriteActionLeaf extends WriteActionBase {
    "@type": "WriteAction";
}
/** The act of authoring written creative content. */
export type WriteAction = WriteActionLeaf;
/** Text representing an XPath (typically but not necessarily version 1.0). */
export type XPathType = string;
interface ZooLeaf extends CivicStructureBase {
    "@type": "Zoo";
}
/** A zoo. */
export type Zoo = ZooLeaf | string;
export {};
