Extension { #name : #Collection }

{
	#category : #'*Oragle',
	#'squeak_changestamp' : 'ct 1/25/2024 18:54'
}
Collection >> oragleDefaultQuery: nonShallow [

	^ Array streamContents: [:stream |
		self withIndexDo: [:ea :index |
			| serialized value |
			serialized := OragleProjects serialize: ea ifNotPrimitiveObject: [Object].
			value := serialized ~= Object
				ifTrue:
					["primitive"
					[serialized]]
				ifFalse:
					[nonShallow ifTrue:
						[[(OragleProjects
								resolveQuery: ea oragleDefaultQuery
								for: ea)
									removeKey: #_sqOriginalQuery;
									yourself]]].
			value ifNotNil:
				[stream nextPut: index asString -> value]]]
]
