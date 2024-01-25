Extension { #name : #Object }

{
	#category : #'*Oragle',
	#'squeak_changestamp' : 'ct 1/25/2024 14:16'
}
Object >> oragleDefaultQuery [

	^ Array streamContents: [:stream |
		self class allInstVarNames withIndexDo: [:name :index |
			| serialized |
			serialized := OragleProjects serialize: (self instVarAt: index) ifNotPrimitiveObject: [Object].
			serialized ~= Object ifTrue:
				["primitive"
				stream nextPut: name -> [serialized]]].
		1 to: self basicSize do: [:index |
			| serialized |
			serialized := OragleProjects serialize: (self instVarAt: index) ifNotPrimitiveObject: [Object].
			serialized ~= Object ifTrue:
				["primitive"
				stream nextPut: index asString -> [serialized]]]]
]
