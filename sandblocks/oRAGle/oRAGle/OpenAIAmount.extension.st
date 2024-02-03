Extension { #name : #OpenAIAmount }

{
	#category : #'*Oragle',
	#'squeak_changestamp' : 'ct 2/4/2024 00:06'
}
OpenAIAmount class >> oragleNan [

	^ self approximateCents: Float nan
]
