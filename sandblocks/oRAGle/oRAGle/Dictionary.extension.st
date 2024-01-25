Extension { #name : #Dictionary }

{
	#category : #'*Oragle',
	#'squeak_changestamp' : 'ct 1/25/2024 18:55'
}
Dictionary >> oragleDefaultQuery: nonShallow [

	^ Array streamContents: [:stream |
		self keysAndValuesDo: [:key :value |
			| serializedKey serializedValue resultValue |
			serializedKey := OragleProjects serialize: key ifNotPrimitiveObject: [Object].
			serializedKey ~= Object ifTrue:
				["primitive key"
				serializedValue := OragleProjects serialize: value ifNotPrimitiveObject: [Object].
				resultValue := serializedValue ~= Object
					ifTrue:
						["primitive value"
						[serializedValue]]
					ifFalse:
						[nonShallow ifTrue:
							[[(OragleProjects
								resolveQuery: value oragleDefaultQuery
								for: value)
									removeKey: #_sqOriginalQuery;
									yourself]]].
				resultValue ifNotNil:
					[stream nextPut: serializedKey asString -> resultValue]]]]
]
