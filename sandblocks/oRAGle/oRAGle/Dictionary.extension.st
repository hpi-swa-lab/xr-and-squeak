Extension { #name : #Dictionary }

{
	#category : #'*Oragle',
	#'squeak_changestamp' : 'ct 1/25/2024 14:36'
}
Dictionary >> oragleDefaultQuery [

	^ Array streamContents: [:stream |
		self keysAndValuesDo: [:key :value |
			| serializedKey serializedValue |
			serializedKey := OragleProjects serialize: key ifNotPrimitiveObject: [Object].
			serializedKey ~= Object ifTrue:
				["primitive key"
				serializedValue := OragleProjects serialize: value ifNotPrimitiveObject: [Object].
				serializedValue ~= Object ifTrue:
					["primitive value"
					stream nextPut: serializedKey asString -> [serializedValue]]]]]
]
