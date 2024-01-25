Extension { #name : #Collection }

{
	#category : #'*Oragle',
	#'squeak_changestamp' : 'ct 1/25/2024 14:15'
}
Collection >> oragleDefaultQuery [

	^ Array streamContents: [:stream |
		1 to: self size do: [:index |
			| serialized |
			serialized := OragleProjects serialize: (self at: index) ifNotPrimitiveObject: [Object].
			serialized ~= Object ifTrue:
				["primitive"
				stream nextPut: index asString -> [serialized]]]]
]
